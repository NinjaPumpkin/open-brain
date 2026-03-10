const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const EMBEDDING_MODEL = "mistralai/mistral-embed-2312";

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Embedding failed: ${res.status} ${msg}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

export async function extractMetadata(
  text: string,
  geminiApiKey?: string
): Promise<Record<string, unknown>> {
  // Use Gemini for metadata extraction (platform-side, free tier friendly)
  const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { topics: ["uncategorized"], type: "observation" };
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract metadata from this captured thought. Return ONLY valid JSON with:
- "people": array of people mentioned (empty array if none)
- "action_items": array of implied to-dos (empty array if none)
- "dates_mentioned": array of dates YYYY-MM-DD (empty array if none)
- "topics": array of 1-3 short topic tags (always at least one)
- "type": one of "observation", "task", "idea", "reference", "person_note"
Only extract what is explicitly stated.

Thought: ${text}`,
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!res.ok) return { topics: ["uncategorized"], type: "observation" };
    const d = await res.json();
    return JSON.parse(d.candidates[0].content.parts[0].text);
  } catch {
    return { topics: ["uncategorized"], type: "observation" };
  }
}
