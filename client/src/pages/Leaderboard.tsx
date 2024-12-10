import { useQuery, useQueries } from "@tanstack/react-query";
import { fetchLeaderboard, fetchPointsHistory } from "../lib/api";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { PerformanceChart } from "../components/PerformanceChart";

interface Employee {
  id: number;
  name: string;
  title: string;
  department: string;
  points: number;
  monthlyPoints: number;
  streak: number;
  pointsHistory?: Array<{
    id: number;
    points: number;
    reason: string;
    createdAt: string;
  }>;
}

export function Leaderboard() {
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard"] as const,
    queryFn: fetchLeaderboard,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const employees = leaderboardQuery.data || [];
  const isLoading = leaderboardQuery.isLoading;

  // Fetch points history for top 5 employees
  const top5Employees = employees.slice(0, 5);
  const historyResults = useQueries({
    queries: top5Employees.map((employee) => ({
      queryKey: ["pointsHistory", employee.id] as const,
      queryFn: () => fetchPointsHistory(employee.id),
      enabled: Boolean(employee.id),
    })),
  });

  const employeesWithHistory = top5Employees.map((employee, index) => ({
    name: employee.name,
    history: historyResults[index]?.data ?? [],
  }));

  return (
    <div className="space-y-8">
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-none">
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <CardTitle>IT Performance Leaderboard</CardTitle>
          </div>
          <CardDescription>
            Real-time rankings based on performance and achievements
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
        <div className="space-y-8">
          <LeaderboardTable employees={employees} />
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Trends</CardTitle>
              <CardDescription>
                Compare performance trends of top performers over time
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <PerformanceChart
                height={400}
                aggregated
                data={employeesWithHistory}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}