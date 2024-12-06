import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BADGE_IMAGES = [
  "https://images.unsplash.com/photo-1548126466-4470dfd3a209",
  "https://images.unsplash.com/photo-1571008840902-28bf8f9cd71a",
  "https://images.unsplash.com/photo-1571008592377-e362723e8998",
  "https://images.unsplash.com/photo-1552035509-b247fe8e5078"
];

interface AchievementCardProps {
  achievement: {
    id: number;
    name: string;
    description: string;
    pointsRequired: number;
    earnedAt: string | null;
  };
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const isEarned = !!achievement.earnedAt;
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      isEarned && "bg-gradient-to-br from-blue-500/20 to-purple-500/20"
    )}>
      <CardHeader className="space-y-4">
        <div className="relative w-full aspect-square rounded-lg overflow-hidden">
          <img
            src={BADGE_IMAGES[achievement.id % BADGE_IMAGES.length]}
            alt={achievement.name}
            className={cn(
              "w-full h-full object-cover transition-all duration-500",
              isEarned ? "grayscale-0" : "grayscale opacity-50"
            )}
          />
          {isEarned && (
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent" />
          )}
        </div>
        <div>
          <CardTitle className="flex items-center gap-2">
            {achievement.name}
            {isEarned && (
              <span className="text-sm text-green-500">Earned!</span>
            )}
          </CardTitle>
          <CardDescription>{achievement.description}</CardDescription>
          <p className="text-sm text-muted-foreground mt-2">
            Required Points: {achievement.pointsRequired}
          </p>
        </div>
      </CardHeader>
    </Card>
  );
}
