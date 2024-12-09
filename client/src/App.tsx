import { Navbar } from "./components/Navbar";
import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Leaderboard } from "./pages/Leaderboard";
import { Profile } from "./pages/Profile";
import { Admin } from "./pages/Admin";
import { Login } from "./pages/Login";
import { initWebSocket } from "./lib/websocket";

export function App() {
  // Initialize WebSocket when app mounts
  useEffect(() => {
    const cleanup = initWebSocket();
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        cleanup(); // Clean up existing connection
        initWebSocket(); // Establish new connection
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanup();
    };
  }, []); // Only initialize once on mount

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
          <Route path="/admin/:rest*">
            {(params) => {
              const [, setLocation] = useLocation();
              const [isAuthenticated, setIsAuthenticated] = useState(false);
              const [isLoading, setIsLoading] = useState(true);
              
              useEffect(() => {
                let mounted = true;
                const checkAuth = async () => {
                  try {
                    const res = await fetch('/api/auth/check');
                    if (mounted) {
                      if (res.ok) {
                        setIsAuthenticated(true);
                      } else {
                        setLocation('/login');
                      }
                    }
                  } catch (error) {
                    if (mounted) {
                      setLocation('/login');
                    }
                  } finally {
                    if (mounted) {
                      setIsLoading(false);
                    }
                  }
                };
                
                checkAuth();
                
                return () => {
                  mounted = false;
                };
              }, [setLocation]);

              if (isLoading) {
                return <div>Loading...</div>;
              }

              if (!isAuthenticated) {
                return null;
              }

              // Parse the rest of the path for nested routing
              const rest = params.rest || "";
              
              return (
                <Switch>
                  <Route path="/admin/profile/:id" component={Profile} />
                  <Route path="/admin" component={Admin} />
                  <Route>404 - Not Found</Route>
                </Switch>
              );
            }}
          </Route>
          <Route>404 Page Not Found</Route>
        </Switch>
      </main>
    </div>
  );
}
