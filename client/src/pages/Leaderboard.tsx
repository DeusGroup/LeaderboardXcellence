import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard } from "../lib/api";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Trophy, Star, Flame, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PerformanceChart } from "../components/PerformanceChart";

interface Employee {
  id: number;
  name: string;
  title: string;
  department: string;
  specialization: string;
  level: string;
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

type SortKey = "points" | "monthlyPoints" | "streak";
type FilterKey = "all" | "backend" | "frontend" | "devops" | "security";

export function Leaderboard() {
  const [sortBy, setSortBy] = useState<SortKey>("points");
  const [filterBy, setFilterBy] = useState<FilterKey>("all");

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const sortedAndFilteredEmployees = employees
    .filter((employee) => filterBy === "all" || employee.specialization === filterBy)
    .sort((a, b) => b[sortBy] - a[sortBy]);

  const statsCards = [
    {
      title: "Top Performer",
      value: employees[0]?.name || "-",
      description: `${employees[0]?.points || 0} points`,
      icon: Trophy,
      color: "text-yellow-500"
    },
    {
      title: "Most Active This Month",
      value: [...employees].sort((a, b) => b.monthlyPoints - a.monthlyPoints)[0]?.name || "-",
      description: `${[...employees].sort((a, b) => b.monthlyPoints - a.monthlyPoints)[0]?.monthlyPoints || 0} points`,
      icon: Star,
      color: "text-blue-500"
    },
    {
      title: "Longest Streak",
      value: [...employees].sort((a, b) => b.streak - a.streak)[0]?.name || "-",
      description: `${[...employees].sort((a, b) => b.streak - a.streak)[0]?.streak || 0} days`,
      icon: Flame,
      color: "text-orange-500"
    }
  ];

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

      <div className="grid gap-4 md:grid-cols-3">
        {statsCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortKey)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="points">Total Points</SelectItem>
              <SelectItem value="monthlyPoints">Monthly Points</SelectItem>
              <SelectItem value="streak">Streak</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterBy}
            onValueChange={(value) => setFilterBy(value as FilterKey)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specializations</SelectItem>
              <SelectItem value="backend">Backend</SelectItem>
              <SelectItem value="frontend">Frontend</SelectItem>
              <SelectItem value="devops">DevOps</SelectItem>
              <SelectItem value="security">Security</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <LeaderboardTable employees={sortedAndFilteredEmployees} />
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
                data={sortedAndFilteredEmployees
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
