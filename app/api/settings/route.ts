import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { llm_provider, llm_model, display_name, api_key } = await req.json();

  const updates: Record<string, unknown> = {
    llm_provider,
    llm_model,
    display_name,
    updated_at: new Date().toISOString(),
  };

  // Encrypt API key server-side before storing
  if (api_key) {
    updates.llm_api_key_encrypted = encrypt(api_key);
  }

  const serviceClient = await createServiceClient();
  const { error } = await serviceClient
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
