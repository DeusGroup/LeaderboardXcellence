import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Employee {
  id: number;
  name: string;
  title: string;
  department: string;
  points: number;
}

interface LeaderboardTableProps {
  employees: Employee[];
}

export function LeaderboardTable({ employees }: LeaderboardTableProps) {
  return (
    <div className="space-y-4">
      {employees?.map((employee, index) => (
        <Link key={employee.id} href={`/profile/${employee.id}`}>
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="p-6 flex items-center justify-between">
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
              <div className="text-right">
                <p className="text-2xl font-bold">{employee.points}</p>
                <p className="text-sm text-muted-foreground">points</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
