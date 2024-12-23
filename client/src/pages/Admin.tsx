import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchLeaderboard, awardPoints, fetchPointsHistory } from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { UserSelect } from "../components/UserSelect";
import { AddUserDialog } from "../components/AddUserDialog";
import { PointsHistory } from "../components/PointsHistory";
import { PerformanceChart } from "../components/PerformanceChart";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Employee {
  id: number;
  name: string;
  title: string;
  department: string;
  points: number;
  imageUrl?: string;
}

interface PointsHistoryEntry {
  id: number;
  employeeId: number;
  points: number;
  reason: string;
  createdAt: string;
  awardedBy: number;
}

export function Admin() {
  const [, setLocation] = useLocation();
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  const { data: history } = useQuery<PointsHistoryEntry[]>({
    queryKey: ["pointsHistory", selectedEmployee],
    queryFn: () => {
      if (!selectedEmployee) return [];
      return fetchPointsHistory(selectedEmployee);
    },
    enabled: !!selectedEmployee,
  });

  const awardPointsMutation = useMutation({
    mutationFn: () => awardPoints(selectedEmployee!, parseInt(points), reason),
    onSuccess: () => {
      // Invalidate all related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["pointsHistory"] });
      queryClient.invalidateQueries({ queryKey: ["profile", selectedEmployee?.toString()] });
      toast({
        title: "Points awarded successfully",
        description: `${points} points awarded to employee`,
      });
      setPoints("");
      setReason("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to award points",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Manage Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Select an employee to view and edit their profile
              </p>
              <AddUserDialog />
            </div>
            <UserSelect currentUserId={undefined} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Award Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employees?.map((employee) => (
              <Button
                key={employee.id}
                variant={selectedEmployee === employee.id ? "default" : "outline"}
                onClick={() => setSelectedEmployee(employee.id)}
                className="justify-start"
              >
                <Avatar className="w-8 h-8 mr-2">
                  <AvatarImage 
                    src={employee.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&size=32`}
                    alt={employee.name}
                    onError={(e) => {
                      console.error('Failed to load profile image:', employee.imageUrl);
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&size=32`;
                    }}
                  />
                  <AvatarFallback>{employee.name[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                {employee.name}
              </Button>
            ))}
          </div>

          {selectedEmployee && (
            <>
              <div className="space-y-4 mt-8">
                <Input
                  type="number"
                  placeholder="Points to award"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                />
                <Textarea
                  placeholder="Reason for points"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button 
                  onClick={() => awardPointsMutation.mutate()}
                  disabled={!points || !reason}
                >
                  Award Points
                </Button>
              </div>

              {/* Points History with Edit Capability */}
              <div className="space-y-8 mt-8">
                <PerformanceChart history={history} />
                <div>
                  <h3 className="text-lg font-semibold mb-4">Points History</h3>
                  <PointsHistory history={history} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
