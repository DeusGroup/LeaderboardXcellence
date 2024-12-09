import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { fetchLeaderboard } from "../lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Employee {
  id: number;
  name: string;
  title: string;
  department: string;
  points: number;
}

interface UserSelectProps {
  currentUserId: string | undefined;
}

export function UserSelect({ currentUserId }: UserSelectProps) {
  const [, setLocation] = useLocation();
  const { data: users } = useQuery<Employee[]>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  return (
    <Select
      value={currentUserId}
      onValueChange={(value) => setLocation(`/admin/profile/${value}`)}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select user" />
      </SelectTrigger>
      <SelectContent>
        {users?.map((user: Employee) => (
          <SelectItem key={user.id} value={user.id.toString()}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
