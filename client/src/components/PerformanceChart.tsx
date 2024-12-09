import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatDistanceToNow } from "date-fns";

interface PointsHistoryEntry {
  id: number;
  points: number;
  reason: string;
  createdAt: string;
}

interface PerformanceChartProps {
  history?: PointsHistoryEntry[];
}

export function PerformanceChart({ history = [] }: PerformanceChartProps) {
  const chartData = useMemo(() => {
    return history
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((entry) => ({
        date: new Date(entry.createdAt),
        points: entry.points,
        reason: entry.reason,
      }));
  }, [history]);

  const config = {
    points: {
      theme: {
        light: "hsl(var(--primary))",
        dark: "hsl(var(--primary))",
      },
      label: "Points",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ChartContainer config={config}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => formatDistanceToNow(date, { addSuffix: true })}
                />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="points"
                  stroke="var(--color-points)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <ChartTooltipContent>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{data.points} Points</p>
                          <p className="text-xs text-muted-foreground">{data.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(data.date, { addSuffix: true })}
                          </p>
                        </div>
                      </ChartTooltipContent>
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
