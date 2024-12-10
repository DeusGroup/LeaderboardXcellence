import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { formatDistanceToNow } from "date-fns";

interface PointsHistoryEntry {
  id: number;
  points: number;
  reason: string;
  createdAt: string;
}

interface ChartDataPoint {
  date: Date;
  [key: string]: any;
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
}: PerformanceChartProps): JSX.Element {
  const chartData = useMemo(() => {
    if (!aggregated || data.length === 0) {
      // Single user data processing
      const sortedHistory = [...history].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      let cumulativePoints = 0;
      return sortedHistory.map(entry => ({
        date: new Date(entry.createdAt),
        points: (cumulativePoints += entry.points),
        reason: entry.reason,
      }));
    }

    // Multiple users data processing
    const allEntries = data.flatMap(({ name, history }) => 
      history.map(entry => ({
        name,
        date: new Date(entry.createdAt),
        points: entry.points,
      }))
    ).sort((a, b) => a.date.getTime() - b.date.getTime());

    if (allEntries.length === 0) return [];

    const startDate = allEntries[0].date;
    const endDate = allEntries[allEntries.length - 1].date;
    
    // Generate daily data points
    const dates: Date[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    // Calculate cumulative points for each employee
    return dates.map(date => {
      const dataPoint: ChartDataPoint = { date };
      
      data.forEach(({ name }) => {
        const entriesUpToDate = allEntries.filter(
          entry => entry.name === name && entry.date <= date
        );
        
        dataPoint[name] = entriesUpToDate.reduce(
          (sum, entry) => sum + entry.points, 
          0
        );
      });

      return dataPoint;
    });
  }, [history, data, aggregated]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
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
            label={{ 
              value: 'Points', 
              angle: -90, 
              position: 'insideLeft', 
              offset: 0 
            }}
          />
          <Tooltip
            labelFormatter={(date: Date) => date.toLocaleDateString()}
            formatter={(value: number) => [value, 'Points']}
          />
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
