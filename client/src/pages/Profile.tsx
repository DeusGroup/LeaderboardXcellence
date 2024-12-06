import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { fetchProfile, fetchAchievements, fetchPointsHistory } from "../lib/api";
import { AchievementCard } from "../components/AchievementCard";
import { PointsHistory } from "../components/PointsHistory";
import { UserSelect } from "../components/UserSelect";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function Profile() {
  const { id } = useParams();
  
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

  const { data: achievements } = useQuery<Achievement[]>({
    queryKey: ["achievements", id],
    queryFn: () => {
      if (!id) throw new Error("No ID provided");
      return fetchAchievements(parseInt(id));
    },
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ["pointsHistory", id],
    queryFn: () => {
      if (!id) throw new Error("No ID provided");
      return fetchPointsHistory(parseInt(id));
    },
    enabled: !!id,
  });

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
                <CardTitle>{profile.name}</CardTitle>
                <p className="text-muted-foreground">{profile.title}</p>
                <p className="text-2xl font-bold mt-2">{profile.points} points</p>
              </div>
            </div>
            <UserSelect currentUserId={id} />
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="achievements">
        <TabsList>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="history">Points History</TabsTrigger>
        </TabsList>
        <TabsContent value="achievements" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements?.map((achievementEntry) => (
              <AchievementCard 
                key={achievementEntry.id} 
                achievement={achievementEntry}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <PointsHistory history={history} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
