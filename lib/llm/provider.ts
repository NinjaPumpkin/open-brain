import type { LLMConfig } from "@/lib/types";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function* streamChat(
  config: LLMConfig,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  switch (config.provider) {
    case "openrouter":
      yield* streamOpenRouter(config, messages);
      break;
    case "openai":
      yield* streamOpenAI(config, messages);
      break;
    case "anthropic":
      yield* streamAnthropic(config, messages);
      break;
    case "gemini":
      yield* streamGemini(config, messages);
      break;
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

async function* streamOpenRouter(
  config: LLMConfig,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 401) throw new Error("INVALID_API_KEY");
    if (status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`PROVIDER_ERROR:${status}`);
  }

  yield* readSSEStream(res);
}

async function* streamOpenAI(
  config: LLMConfig,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 401) throw new Error("INVALID_API_KEY");
    if (status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`PROVIDER_ERROR:${status}`);
  }

  yield* readSSEStream(res);
}

async function* streamAnthropic(
  config: LLMConfig,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystemMsgs = messages.filter((m) => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: systemMsg?.content || "",
      messages: nonSystemMsgs.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    }),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 401) throw new Error("INVALID_API_KEY");
    if (status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`PROVIDER_ERROR:${status}`);
  }

  // Anthropic SSE uses content_block_delta events
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "content_block_delta") {
          yield parsed.delta?.text || "";
        }
      } catch {
        // skip malformed lines
      }
    }
  }
}

async function* streamGemini(
  config: LLMConfig,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemMsg = messages.find((m) => m.role === "system");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(systemMsg && {
          systemInstruction: { parts: [{ text: systemMsg.content }] },
        }),
      }),
    }
  );

  if (!res.ok) {
    const status = res.status;
    if (status === 401 || status === 403) throw new Error("INVALID_API_KEY");
    if (status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`PROVIDER_ERROR:${status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch {
        // skip
      }
    }
  }
}

async function* readSSEStream(res: Response): AsyncGenerator<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip
      }
    }
  }
}
