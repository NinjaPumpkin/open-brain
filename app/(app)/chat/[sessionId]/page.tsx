"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      setMessages((data as Message[]) || []);
    }
    loadMessages();
  }, [sessionId, supabase]);

  const handleSend = useCallback(
    async (message: string) => {
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setStreamingContent("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, sessionId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.error === "NO_API_KEY") {
            toast.error("Please add your API key in Settings.");
          } else {
            toast.error("Failed to send message");
          }
          setIsLoading(false);
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                if (parsed.error === "INVALID_API_KEY") {
                  toast.error("Your API key is invalid. Update it in Settings.");
                } else if (parsed.error === "RATE_LIMITED") {
                  toast.error("Rate limited by your AI provider. Wait a moment.");
                } else {
                  toast.error("AI provider error. Try again.");
                }
                break;
              }
              fullContent += parsed.text;
              setStreamingContent(fullContent);
            } catch {
              // skip malformed
            }
          }
        }

        if (fullContent) {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", content: fullContent },
          ]);
        }
      } catch {
        toast.error("Connection error. Please try again.");
      } finally {
        setStreamingContent("");
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  return (
    <>
      <ChatMessages messages={messages} streamingContent={streamingContent} />
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </>
  );
}
