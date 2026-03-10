import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { hybridSearch } from "@/lib/llm/search";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { query, limit = 10 } = await req.json();

  if (!query) {
    return Response.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const serviceClient = await createServiceClient();
    const results = await hybridSearch(serviceClient, query, user.id, limit);
    return Response.json({ results });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
