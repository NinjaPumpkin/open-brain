import { getEmbedding } from "./embedding";
import type { SearchResult } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function hybridSearch(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const queryEmbedding = await getEmbedding(query);

  const [thoughtsResult, documentsResult] = await Promise.all([
    supabase.rpc("hybrid_search_thoughts", {
      query_text: query,
      query_embedding: queryEmbedding,
      user_id_filter: userId,
      match_count: limit,
    }),
    supabase.rpc("hybrid_search_documents", {
      query_text: query,
      query_embedding: queryEmbedding,
      user_id_filter: userId,
      match_count: limit,
    }),
  ]);

  const results: SearchResult[] = [];

  if (thoughtsResult.data) {
    for (const t of thoughtsResult.data) {
      results.push({
        id: t.id,
        content: t.content,
        metadata: t.metadata || {},
        score: t.score,
        source: "thought",
      });
    }
  }

  if (documentsResult.data) {
    for (const d of documentsResult.data) {
      results.push({
        id: d.id,
        content: d.summary || "",
        metadata: d.metadata || {},
        score: d.score,
        source: "document",
        title: d.title,
        summary: d.summary,
      });
    }
  }

  // Sort combined results by score descending
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
