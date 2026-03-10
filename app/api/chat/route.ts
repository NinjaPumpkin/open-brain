import { createClient } from "@/lib/supabase/server";
import { streamChat } from "@/lib/llm/provider";
import { hybridSearch } from "@/lib/llm/search";
import { buildSystemPrompt } from "@/lib/llm/prompts";
import { decrypt } from "@/lib/crypto";
import type { LLMConfig } from "@/lib/types";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { message, sessionId } = await req.json();

  if (!message || !sessionId) {
    return new Response("Missing message or sessionId", { status: 400 });
  }

  // Get user profile for LLM config
  const { data: profile } = await supabase
    .from("profiles")
    .select("llm_provider, llm_api_key_encrypted, llm_model, display_name")
    .eq("id", user.id)
    .single();

  if (!profile?.llm_api_key_encrypted) {
    return new Response(
      JSON.stringify({ error: "NO_API_KEY", message: "Please add your API key in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const llmConfig: LLMConfig = {
    provider: profile.llm_provider as LLMConfig["provider"],
    apiKey: decrypt(profile.llm_api_key_encrypted),
    model: profile.llm_model,
  };

  // Store user message
  await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: "user",
    content: message,
  });

  // Search memory for context
  let searchResults: import("@/lib/types").SearchResult[] = [];
  try {
    const serviceClient = (await import("@/lib/supabase/server")).createServiceClient;
    const svc = await serviceClient();
    searchResults = await hybridSearch(svc, message, user.id, 8);
  } catch {
    searchResults = [];
  }

  // Build conversation history
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(20);

  const systemPrompt = buildSystemPrompt(searchResults, profile.display_name);

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(history || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // Stream response
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChat(llmConfig, messages)) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }

        // Store assistant response
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: fullResponse,
          context_used: {
            thoughtIds: searchResults.filter((r) => r.source === "thought").map((r) => r.id),
            documentIds: searchResults.filter((r) => r.source === "document").map((r) => r.id),
            scores: searchResults.map((r) => r.score),
          },
        });

        // Auto-generate session title if first message
        if ((history || []).length <= 1) {
          const title = message.length > 50 ? message.slice(0, 47) + "..." : message;
          await supabase
            .from("chat_sessions")
            .update({ title, updated_at: new Date().toISOString() })
            .eq("id", sessionId);
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const errorMsg = (err as Error).message;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
