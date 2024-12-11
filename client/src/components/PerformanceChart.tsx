import { useMemo } from "react";
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
  height?: number;
}

export function PerformanceChart({ 
  history = [], 
  title,
  aggregated = false,
  data = [],
  height = 300
}: PerformanceChartProps) {
  const chartData = useMemo(() => {
    if (aggregated && data.length > 0) {
      // Get all points history entries
      const allEntries = data.flatMap(({ name, history }) => 
        history.map(entry => ({
          ...entry,
          employeeName: name,
          date: new Date(entry.createdAt)
        }))
      );

      // Sort entries by date
      allEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Get unique dates for x-axis
      const uniqueDates = Array.from(
        new Set(allEntries.map(entry => entry.date.toISOString().split('T')[0]))
      ).map(dateStr => new Date(dateStr));

      // Calculate cumulative points for each employee
      return uniqueDates.map(date => {
        const dataPoint: Record<string, any> = { date };
        
        data.forEach(({ name }) => {
          const entriesUpToDate = allEntries.filter(
            entry => 
              entry.employeeName === name && 
              entry.date <= date
          );
          dataPoint[name] = entriesUpToDate.reduce(
            (sum, entry) => sum + entry.points, 
            0
          );
        });

        return dataPoint;
      });
    }

    // Single user chart data
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
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartContainer config={config}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(date: Date) => formatDistanceToNow(date, { addSuffix: true })}
              height={50}
              tick={{ fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              width={50}
              tick={{ fontSize: 12 }}
              tickMargin={8}
              label={{ value: 'Points', angle: -90, position: 'insideLeft', offset: 0 }}
            />
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            {aggregated ? (
              data.map(({ name }, index) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={`hsl(var(--chart-${(index % 5) + 1}))`}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey="points"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
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
        </ChartContainer>
      </ResponsiveContainer>
    </div>
  );
}
