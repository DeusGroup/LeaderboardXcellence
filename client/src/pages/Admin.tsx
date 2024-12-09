import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchLeaderboard, awardPoints } from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { UserSelect } from "../components/UserSelect";
import { AddUserDialog } from "../components/AddUserDialog";

interface Employee {
  id: number;
  name: string;
  title: string;
  department: string;
  points: number;
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

  const awardPointsMutation = useMutation({
    mutationFn: () => awardPoints(selectedEmployee!, parseInt(points), reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      toast({
        title: "Points awarded successfully",
        description: `${points} points awarded to employee`,
      });
      setPoints("");
      setReason("");
      setSelectedEmployee(null);
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
                <img
                  src={`https://i.pravatar.cc/32?u=${employee.id}`}
                  alt=""
                  className="w-8 h-8 rounded-full mr-2"
                />
                {employee.name}
              </Button>
            ))}
          </div>

          {selectedEmployee && (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
