import type { SearchResult } from "@/lib/types";

export function buildSystemPrompt(
  context: SearchResult[],
  userName: string | null
): string {
  const greeting = userName ? `The user's name is ${userName}.` : "";

  const contextBlock =
    context.length > 0
      ? context
          .map((r, i) => {
            if (r.source === "thought") {
              const meta = r.metadata;
              const type = meta.type || "thought";
              const topics = Array.isArray(meta.topics)
                ? meta.topics.join(", ")
                : "";
              return `[Memory ${i + 1}] (${type}${topics ? ` — ${topics}` : ""}) ${r.content}`;
            } else {
              return `[Document ${i + 1}] "${r.title}" — ${r.summary || r.content}`;
            }
          })
          .join("\n\n")
      : "No relevant memories found.";

  return `You are Open Brain, a personal AI assistant with access to the user's knowledge base.
${greeting}

CRITICAL RULES:
1. Your ONLY source of facts about the user is the RETRIEVED CONTEXT below.
2. If the context is empty or irrelevant, say so honestly — do not hallucinate memories.
3. When referencing memories, be specific about what you found.
4. Be concise and helpful.
5. If asked a general knowledge question unrelated to the user's memories, answer from your training data but note it's not from their brain.

RETRIEVED CONTEXT FROM KNOWLEDGE BASE:
${contextBlock}`;
}
