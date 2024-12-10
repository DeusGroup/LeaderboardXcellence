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
  title?: string;
  aggregated?: boolean;
  data?: Array<{
    name: string;
    history: PointsHistoryEntry[];
  }>;
}

export function PerformanceChart({ 
  history = [], 
  title = "Performance Trend",
  aggregated = false,
  data = []
}: PerformanceChartProps) {
  const chartData = useMemo(() => {
    if (aggregated && data.length > 0) {
      // Create a map of dates to employee points
      const dateMap = new Map<string, { [key: string]: number }>();
      
      data.forEach(({ name, history }) => {
        history.forEach((entry) => {
          const date = new Date(entry.createdAt).toISOString().split('T')[0];
          if (!dateMap.has(date)) {
            dateMap.set(date, {});
          }
          const dateData = dateMap.get(date)!;
          dateData[name] = entry.points;
        });
      });

      // Convert map to array and sort by date
      return Array.from(dateMap.entries())
        .map(([date, points]) => ({
          date: new Date(date),
          ...points
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    return history
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((entry) => ({
        date: new Date(entry.createdAt),
        points: entry.points,
        reason: entry.reason,
      }));
  }, [history, data, aggregated]);

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
        <CardTitle>{title}</CardTitle>
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
                {aggregated ? (
                  data.map(({ name }, index) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={`hsl(var(--chart-${(index % 5) + 1}))`}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))
                ) : (
                  <Line
                    type="monotone"
                    dataKey="points"
                    stroke="var(--color-points)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                )}
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <ChartTooltipContent>
                        <div className="space-y-1">
                          {aggregated ? (
                            payload.map((entry) => (
                              <p key={entry.dataKey} className="text-sm font-medium">
                                {entry.dataKey}: {entry.value} Points
                              </p>
                            ))
                          ) : (
                            <>
                              <p className="text-sm font-medium">{data.points} Points</p>
                              <p className="text-xs text-muted-foreground">{data.reason}</p>
                            </>
                          )}
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
