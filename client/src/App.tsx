import { Navbar } from "./components/Navbar";
import { Route, Switch } from "wouter";
import { Leaderboard } from "./pages/Leaderboard";
import { Profile } from "./pages/Profile";
import { Admin } from "./pages/Admin";
import { useEffect } from "react";
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
            linear-gradient(90deg, rgba(18, 18, 18, 0.8) 2px, transparent 2px) 0 0 / 50px 50px,
            linear-gradient(rgba(18, 18, 18, 0.8) 2px, transparent 2px) 0 0 / 50px 50px,
            radial-gradient(circle, rgba(0, 120, 255, 0.1) 1px, transparent 1px) 0 0 / 25px 25px
          `,
          backgroundColor: 'rgba(240, 240, 255, 0.05)',
          opacity: 0.15
        }}
      />
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={Leaderboard} />
          <Route path="/profile/:id" component={Profile} />
          <Route path="/admin" component={Admin} />
          <Route>404 Page Not Found</Route>
        </Switch>
      </main>
    </div>
  );
}
