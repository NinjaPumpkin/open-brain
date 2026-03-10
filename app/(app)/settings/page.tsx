"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const PROVIDERS = [
  { value: "openrouter", label: "OpenRouter (all models)", placeholder: "sk-or-..." },
  { value: "gemini", label: "Google Gemini", placeholder: "AIza..." },
  { value: "openai", label: "OpenAI", placeholder: "sk-..." },
  { value: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
] as const;

const DEFAULT_MODELS: Record<string, string> = {
  openrouter: "google/gemini-2.5-flash",
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
};

export default function SettingsPage() {
  const supabase = createClient();
  const [provider, setProvider] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setProvider(profile.llm_provider || "openrouter");
        setModel(profile.llm_model || DEFAULT_MODELS[profile.llm_provider || "openrouter"]);
        setHasExistingKey(!!profile.llm_api_key_encrypted);
        setDisplayName(profile.display_name || "");
      }
    }
    load();
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const updates: Record<string, unknown> = {
      llm_provider: provider,
      llm_model: model || DEFAULT_MODELS[provider],
      display_name: displayName,
      updated_at: new Date().toISOString(),
    };

    // Save via server-side API route (handles encryption)
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        llm_provider: provider,
        llm_model: model || DEFAULT_MODELS[provider],
        display_name: displayName,
        ...(apiKey && { api_key: apiKey }),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to save");
    } else {
      toast.success("Settings saved");
      setApiKey("");
      setHasExistingKey(true);
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your Open Brain</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
          <CardDescription>
            Bring your own API key. We never store it in plain text.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <select
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setModel(DEFAULT_MODELS[e.target.value] || "");
              }}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder={
                hasExistingKey
                  ? "••••••••  (key saved, enter new to replace)"
                  : PROVIDERS.find((p) => p.value === provider)?.placeholder
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Input
              placeholder={DEFAULT_MODELS[provider]}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Default: {DEFAULT_MODELS[provider]}
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
