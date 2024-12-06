import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface PointsHistoryEntry {
  id: number;
  points: number;
  reason: string;
  createdAt: string;
  awardedBy: number;
}

interface PointsHistoryProps {
  history?: PointsHistoryEntry[];
}

export function PointsHistory({ history }: PointsHistoryProps) {
  if (!history?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No points history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {entry.points > 0 ? "+" : ""}{entry.points} points
                </p>
                <p className="text-muted-foreground">{entry.reason}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
