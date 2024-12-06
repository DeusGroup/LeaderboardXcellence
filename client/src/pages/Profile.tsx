import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { fetchProfile, fetchAchievements, fetchPointsHistory } from "../lib/api";
import { AchievementCard } from "../components/AchievementCard";
import { PointsHistory } from "../components/PointsHistory";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function Profile() {
  const { id } = useParams();
  
  const { data: profile } = useQuery({
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

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-none">
        <CardHeader className="flex flex-row items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={`https://i.pravatar.cc/150?u=${profile.id}`} />
            <AvatarFallback>{profile.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{profile.name}</CardTitle>
            <p className="text-muted-foreground">{profile.title}</p>
            <p className="text-2xl font-bold mt-2">{profile.points} points</p>
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
