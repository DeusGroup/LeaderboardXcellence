import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPointsHistory } from "../lib/api";
import { PointsHistory } from "./PointsHistory";

interface Employee {
  id: number;
  name: string;
  title: string;
  department: string;
  points: number;
  monthlyPoints: number;
  streak: number;
}

interface LeaderboardTableProps {
  employees: Employee[];
}

export function LeaderboardTable({ employees }: LeaderboardTableProps) {
  const [expandedEmployee, setExpandedEmployee] = useState<number | null>(null);

  const { data: pointsHistory } = useQuery({
    queryKey: ["pointsHistory", expandedEmployee],
    queryFn: () => {
      if (!expandedEmployee) return null;
      return fetchPointsHistory(expandedEmployee);
    },
    enabled: !!expandedEmployee,
  });

  return (
    <div className="space-y-4">
      {employees?.map((employee, index) => (
        <div key={employee.id}>
          <Card 
            className="hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => setExpandedEmployee(
              expandedEmployee === employee.id ? null : employee.id
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-8 text-center">
                    {index < 3 ? (
                      <Trophy className={cn(
                        "h-6 w-6",
                        index === 0 && "text-yellow-500",
                        index === 1 && "text-gray-400",
                        index === 2 && "text-amber-600"
                      )} />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <Avatar>
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${employee.id}`} />
                    <AvatarFallback>{employee.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{employee.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {employee.title} • {employee.department}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-2xl font-bold">{employee.points}</p>
                    <p className="text-sm text-muted-foreground">total points</p>
                  </div>
                  {expandedEmployee === employee.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {expandedEmployee === employee.id && (
            <div className="mt-2 pl-12">
              <PointsHistory history={pointsHistory} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}