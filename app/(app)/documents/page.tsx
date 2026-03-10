import { createClient } from "@/lib/supabase/server";
import { DocumentCard } from "@/components/documents/document-card";
import type { Document } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, source, file_type, file_path, summary, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">
          {(documents || []).length} document{(documents || []).length !== 1 ? "s" : ""} captured
        </p>
      </div>

      <div className="space-y-3">
        {(documents as Document[] || []).map((doc) => (
          <DocumentCard key={doc.id} document={doc} />
        ))}
        {(!documents || documents.length === 0) && (
          <p className="py-8 text-center text-muted-foreground">
            No documents yet. Send files to your Telegram bot or capture links.
          </p>
        )}
      </div>
    </div>
  );
}
