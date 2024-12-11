import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard } from "../lib/api";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export interface Employee {
  id: number;
  name: string;
  title: string;
  department: string;
  points: number;
  monthlyPoints: number;
  streak: number;
}

export function Leaderboard() {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["leaderboard"] as const,
    queryFn: fetchLeaderboard,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div className="space-y-8">
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-none">
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <CardTitle>IT Incentive Leaderboard</CardTitle>
          </div>
          <CardDescription>
            Real-time rankings based on achievements and contributions
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <LeaderboardTable employees={employees} />
      )}
    </div>
  );
}