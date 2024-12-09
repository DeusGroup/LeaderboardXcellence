import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pencil } from "lucide-react";
import { updatePoints } from "../lib/api";

interface EditPointsDialogProps {
  historyId: number;
  employeeId: number;
  currentPoints: number;
  currentReason: string;
}

export function EditPointsDialog({ 
  historyId, 
  employeeId,
  currentPoints, 
  currentReason 
}: EditPointsDialogProps) {
  const [open, setOpen] = useState(false);
  const [points, setPoints] = useState(currentPoints.toString());
  const [reason, setReason] = useState(currentReason);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updatePointsMutation = useMutation({
    mutationFn: () => updatePoints(historyId, parseInt(points), reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pointsHistory", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      toast({
        title: "Points updated",
        description: "The points have been updated successfully.",
      });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error && error.message.includes("negative balance")
          ? "Cannot update points: This would result in a negative points balance"
          : "Failed to update points. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Points</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Enter points"
            />
          </div>
          <div className="space-y-2">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason"
            />
          </div>
          <Button 
            className="w-full" 
            onClick={() => updatePointsMutation.mutate()}
            disabled={updatePointsMutation.isPending || !points || !reason}
          >
            {updatePointsMutation.isPending ? "Updating..." : "Update Points"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
