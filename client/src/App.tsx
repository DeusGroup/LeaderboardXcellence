import { Navbar } from "./components/Navbar";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import { Leaderboard } from "./pages/Leaderboard";
import { Profile } from "./pages/Profile";
import { Admin } from "./pages/Admin";
import { Login } from "./pages/Login";
import { initWebSocket } from "./lib/websocket";

export function App() {
  useEffect(() => {
    initWebSocket();
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
            {(params) => {
              const [, setLocation] = useLocation();
              useEffect(() => {
                fetch('/api/auth/check')
                  .then(res => {
                    if (!res.ok) {
                      setLocation('/login');
                    }
                  })
                  .catch(() => {
                    setLocation('/login');
                  });
              }, [setLocation]);
              return <Profile />;
            }}
          </Route>
          <Route path="/admin" component={Admin} />
          <Route>404 Page Not Found</Route>
        </Switch>
      </main>
    </div>
  );
}
