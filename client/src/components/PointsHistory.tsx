import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { EditPointsDialog } from "./EditPointsDialog";
import { DeletePointsHistoryDialog } from "./DeletePointsHistoryDialog";

interface PointsHistoryEntry {
  id: number;
  points: number;
  reason: string;
  createdAt: string;
  awardedBy: number;
  employeeId: number;
}

interface PointsHistoryProps {
  history?: PointsHistoryEntry[];
}

export function PointsHistory({ history }: PointsHistoryProps) {
  const [location] = useLocation();
  const isAdmin = location.startsWith('/admin');

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
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-lg">
                    {entry.points > 0 ? "+" : ""}{entry.points} points
                  </p>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <EditPointsDialog
                        historyId={entry.id}
                        employeeId={entry.employeeId}
                        currentPoints={entry.points}
                        currentReason={entry.reason}
                      />
                      <DeletePointsHistoryDialog
                        historyId={entry.id}
                        employeeId={entry.employeeId}
                        points={entry.points}
                      />
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground">{entry.reason}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
