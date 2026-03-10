"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./chat-message";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatMessagesProps {
  messages: Message[];
  streamingContent: string;
}

export function ChatMessages({ messages, streamingContent }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 py-4">
        {messages.length === 0 && !streamingContent && (
          <div className="flex h-full items-center justify-center py-20 text-center text-muted-foreground">
            <div>
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm">Ask me anything about your memories, or just chat.</p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {streamingContent && (
          <ChatMessage
            role="assistant"
            content={streamingContent}
            isStreaming
          />
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
