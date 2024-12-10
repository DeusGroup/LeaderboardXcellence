import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard } from "../lib/api";
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
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const employees = await fetchLeaderboard();
      // Fetch points history for each employee
      const employeesWithHistory = await Promise.all(
        employees.map(async (employee) => ({
          ...employee,
          pointsHistory: await fetchPointsHistory(employee.id)
        }))
      );
      return employeesWithHistory;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
                data={employees
                  .slice(0, 5)
                  .map(employee => ({
                    name: employee.name,
                    history: employee.pointsHistory || []
                  }))}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}