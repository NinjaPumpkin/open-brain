"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Thought } from "@/lib/types";

interface ThoughtCardProps {
  thought: Thought;
}

export function ThoughtCard({ thought }: ThoughtCardProps) {
  const supabase = createClient();
  const router = useRouter();
  const meta = thought.metadata;

  async function handleDelete() {
    if (!confirm("Delete this thought?")) return;
    const { error } = await supabase
      .from("thoughts")
      .delete()
      .eq("id", thought.id);

    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Thought deleted");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {new Date(thought.created_at).toLocaleDateString()}
              </span>
              {meta.type && <Badge variant="outline">{meta.type}</Badge>}
              {meta.source && (
                <Badge variant="secondary">{meta.source}</Badge>
              )}
            </div>
            <p className="text-sm">{thought.content}</p>
            {Array.isArray(meta.topics) && meta.topics.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {meta.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
