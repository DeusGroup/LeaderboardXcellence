import { Navbar } from "./components/Navbar";
import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Leaderboard } from "./pages/Leaderboard";
import { Profile } from "./pages/Profile";
import { Admin } from "./pages/Admin";
import { Login } from "./pages/Login";
import { initWebSocket, setWebSocketMessageHandler } from "./lib/websocket";
import { useToast } from "@/hooks/use-toast";

function ProtectedRoute({ component: Component, ...props }: { component: React.ComponentType<any>, [key: string]: any }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch('/api/auth/check')
      .then(res => {
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          setLocation('/login');
        }
      })
      .catch(() => setLocation('/login'))
      .finally(() => setIsLoading(false));
  }, [setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Component {...props} />;
}

export function App() {
  // Initialize WebSocket when app mounts
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    interface WebSocketMessage {
      type: 'POINTS_AWARDED' | 'ACHIEVEMENT_UNLOCKED' | 'RANK_CHANGED' | 'PROFILE_UPDATED';
      points?: number;
      reason?: string;
      achievementName?: string;
      newRank?: number;
      employeeId?: number;
      profile?: {
        name: string;
        imageUrl: string | null;
        title: string;
        department: string;
      };
    }
    
    const handleWebSocketMessage = (data: WebSocketMessage) => {
      switch (data.type) {
        case "POINTS_AWARDED":
          toast({
            title: "Points Awarded!",
            description: `You've earned ${data.points} points for ${data.reason}`,
          });
          break;
        case "ACHIEVEMENT_UNLOCKED":
          toast({
            title: "Achievement Unlocked!",
            description: data.achievementName,
            variant: "default",
          });
          break;
        case "RANK_CHANGED":
          toast({
            title: "Rank Updated!",
            description: `You're now ranked #${data.newRank}`,
          });
          break;
        case "PROFILE_UPDATED":
          if (data.profile) {
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ["profile", data.employeeId?.toString()] });
            queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
          }
          break;
      }
    };

    setWebSocketMessageHandler(handleWebSocketMessage);
    const cleanup = initWebSocket();
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        cleanup();
        initWebSocket();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setWebSocketMessageHandler(() => {}); // Use empty function instead of null
      cleanup();
    };
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            linear-gradient(90deg, hsl(var(--muted-foreground)) 1px, transparent 1px) 0 0 / 40px 40px,
            linear-gradient(hsl(var(--muted-foreground)) 1px, transparent 1px) 0 0 / 40px 40px
          `,
          opacity: 0.1
        }}
      />
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={Leaderboard} />
          <Route path="/login" component={Login} />
          <Route path="/profile/:id" component={Profile} />
          <Route path="/admin/profile/:id">
            {({ id }) => <ProtectedRoute component={Profile} id={id} />}
          </Route>
          <Route path="/admin">
            <ProtectedRoute component={Admin} />
          </Route>
          <Route>
            <div className="flex items-center justify-center min-h-[60vh]">
              <p className="text-lg text-muted-foreground">404 - Page Not Found</p>
            </div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}
