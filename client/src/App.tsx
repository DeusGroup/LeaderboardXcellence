import { Navbar } from "./components/Navbar";
import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Leaderboard } from "./pages/Leaderboard";
import { Profile } from "./pages/Profile";
import { Admin } from "./pages/Admin";
import { Login } from "./pages/Login";
import { initWebSocket } from "./lib/websocket";

function ProtectedRoute({ component: Component, ...props }: { component: React.ComponentType<any> }) {
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
  useEffect(() => {
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
      cleanup();
    };
  }, []);

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
