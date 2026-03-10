import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Document } from "@/lib/types";

interface DocumentCardProps {
  document: Document;
}

export function DocumentCard({ document }: DocumentCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-medium">{document.title}</h3>
              <Badge variant="outline">{document.file_type}</Badge>
              <Badge variant="secondary">{document.source}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(document.created_at).toLocaleDateString()}
            </p>
            {document.summary && (
              <p className="mt-2 text-sm text-muted-foreground">
                {document.summary}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
