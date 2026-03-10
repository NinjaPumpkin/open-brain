import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEmbedding, extractMetadata } from "@/lib/llm/embedding";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { content } = await req.json();

  if (!content) {
    return Response.json({ error: "Missing content" }, { status: 400 });
  }

  try {
    const [embedding, metadata] = await Promise.all([
      getEmbedding(content),
      extractMetadata(content),
    ]);

    const serviceClient = await createServiceClient();
    const { error } = await serviceClient.from("thoughts").insert({
      user_id: user.id,
      content,
      embedding,
      metadata: { ...metadata, source: "web" },
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, metadata });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
