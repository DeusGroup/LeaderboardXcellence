import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { fetchProfile, fetchPointsHistory } from "../lib/api";
import { PointsHistory } from "../components/PointsHistory";
import { UserSelect } from "../components/UserSelect";
import { EditProfileDialog } from "../components/EditProfileDialog";
import { DeleteUserDialog } from "../components/DeleteUserDialog";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function Profile() {
  const { id } = useParams();
  const [location] = useLocation();
  
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useQuery({
    queryKey: ["profile", id],
    queryFn: () => {
      if (!id) throw new Error("No ID provided");
      return fetchProfile(id);
    },
    enabled: !!id,
  });

  interface Achievement {
    id: number;
    name: string;
    description: string;
    pointsRequired: number;
    badgeImageUrl: string;
    earnedAt: string | null;
  }

  const { data: history } = useQuery({
    queryKey: ["pointsHistory", id],
    queryFn: () => {
      if (!id) throw new Error("No ID provided");
      return fetchPointsHistory(parseInt(id));
    },
    enabled: !!id,
  });

  // Authentication is handled at the route level in App.tsx

  if (isProfileLoading) return (
    <div className="space-y-4">
      <div className="h-32 bg-muted animate-pulse rounded-lg" />
      <div className="h-64 bg-muted animate-pulse rounded-lg" />
    </div>
  );

  if (profileError) return (
    <div className="text-center py-12 text-destructive">
      Error loading profile. Please try again.
    </div>
  );

  if (!profile) return (
    <div className="text-center py-12 text-muted-foreground">
      Profile not found
    </div>
  );

  return (
    <div className="space-y-8">
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-none">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={`https://i.pravatar.cc/150?u=${profile.id}`} />
                <AvatarFallback>{profile.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-4">
                  <CardTitle>{profile.name}</CardTitle>
                  {location.startsWith('/admin') && (
                    <div className="flex items-center gap-2">
                      <EditProfileDialog
                        employeeId={profile.id}
                        currentName={profile.name}
                        currentTitle={profile.title}
                        currentDepartment={profile.department}
                      />
                      <DeleteUserDialog
                        employeeId={profile.id}
                        employeeName={profile.name}
                      />
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground">{profile.title}</p>
                <p className="text-2xl font-bold mt-2">{profile.points} points</p>
              </div>
            </div>
            <UserSelect currentUserId={id} />
          </div>
        </CardHeader>
      </Card>

      <div className="mt-8">
        <PointsHistory history={history} />
      </div>
    </div>
  );
}
