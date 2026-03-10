import { createClient } from "@/lib/supabase/server";
import { StatsCards } from "@/components/dashboard/stats-cards";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [thoughtsRes, docsRes, sessionsRes, recentThoughtsRes] =
    await Promise.all([
      supabase
        .from("thoughts")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("documents")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("chat_sessions")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("thoughts")
        .select("content, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  // Extract top topics
  const topicCounts: Record<string, number> = {};
  for (const t of recentThoughtsRes.data || []) {
    const meta = t.metadata as Record<string, unknown>;
    if (Array.isArray(meta?.topics)) {
      for (const topic of meta.topics) {
        topicCounts[topic as string] = (topicCounts[topic as string] || 0) + 1;
      }
    }
  }
  const topTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your brain at a glance</p>
      </div>

      <StatsCards
        thoughtCount={thoughtsRes.count || 0}
        documentCount={docsRes.count || 0}
        sessionCount={sessionsRes.count || 0}
        topTopics={topTopics}
      />

      <div>
        <h2 className="mb-4 text-xl font-semibold">Recent Thoughts</h2>
        <div className="space-y-2">
          {(recentThoughtsRes.data || []).slice(0, 10).map((t, i) => {
            const meta = t.metadata as Record<string, unknown>;
            return (
              <div
                key={i}
                className="rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()} —{" "}
                    {(meta?.type as string) || "thought"}
                  </span>
                  {Array.isArray(meta?.topics) && (
                    <div className="flex gap-1">
                      {(meta.topics as string[]).map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1">{t.content}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
