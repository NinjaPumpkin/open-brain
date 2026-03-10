import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, FileText, MessageSquare, Tag } from "lucide-react";

interface StatsCardsProps {
  thoughtCount: number;
  documentCount: number;
  sessionCount: number;
  topTopics: { name: string; count: number }[];
}

export function StatsCards({
  thoughtCount,
  documentCount,
  sessionCount,
  topTopics,
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Thoughts</CardTitle>
          <Lightbulb className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{thoughtCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Documents</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{documentCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{sessionCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Top Topics</CardTitle>
          <Tag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {topTopics.slice(0, 5).map((t) => (
              <span
                key={t.name}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
              >
                {t.name} ({t.count})
              </span>
            ))}
            {topTopics.length === 0 && (
              <span className="text-sm text-muted-foreground">No topics yet</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
