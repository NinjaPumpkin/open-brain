"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThoughtCard } from "@/components/memories/thought-card";
import { MemoryFilters } from "@/components/memories/memory-filters";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Thought } from "@/lib/types";

export default function MemoriesPage() {
  const [supabase] = useState(() => createClient());
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [search, setSearch] = useState("");
  const [newThought, setNewThought] = useState("");
  const [showCapture, setShowCapture] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadThoughts = useCallback(async () => {
    const { data } = await supabase
      .from("thoughts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setThoughts((data as Thought[]) || []);
  }, [supabase]);

  useEffect(() => {
    loadThoughts();
  }, [loadThoughts]);

  async function handleCapture() {
    if (!newThought.trim()) return;
    setSaving(true);

    const res = await fetch("/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newThought.trim() }),
    });

    if (res.ok) {
      toast.success("Thought captured");
      setNewThought("");
      setShowCapture(false);
      loadThoughts();
    } else {
      toast.error("Failed to capture thought");
    }
    setSaving(false);
  }

  const filtered = search
    ? thoughts.filter(
        (t) =>
          t.content.toLowerCase().includes(search.toLowerCase()) ||
          (t.metadata.topics || []).some((topic) =>
            topic.toLowerCase().includes(search.toLowerCase())
          )
      )
    : thoughts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Memories</h1>
          <p className="text-muted-foreground">
            {thoughts.length} thought{thoughts.length !== 1 ? "s" : ""} captured
          </p>
        </div>
        <Button onClick={() => setShowCapture(!showCapture)} variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Capture thought
        </Button>
      </div>

      {showCapture && (
        <div className="rounded-lg border p-4 space-y-3">
          <Textarea
            placeholder="What's on your mind?"
            value={newThought}
            onChange={(e) => setNewThought(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button onClick={handleCapture} disabled={saving || !newThought.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" onClick={() => setShowCapture(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <MemoryFilters search={search} onSearchChange={setSearch} />

      <div className="space-y-3">
        {filtered.map((thought) => (
          <ThoughtCard key={thought.id} thought={thought} />
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            {search ? "No memories match your search." : "No memories yet. Start capturing!"}
          </p>
        )}
      </div>
    </div>
  );
}
