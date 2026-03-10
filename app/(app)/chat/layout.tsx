import { createClient } from "@/lib/supabase/server";
import { ChatSidebar } from "@/components/chat/chat-sidebar";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <div className="-m-6 flex h-[calc(100vh)] overflow-hidden">
      <ChatSidebar sessions={sessions || []} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
