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
          backgroundImage: 'url(https://images.unsplash.com/photo-1542903660-eedba2cda473?q=80)',
          backgroundBlendMode: 'soft-light',
          backgroundSize: 'cover',
          opacity: 0.25,
          filter: 'brightness(0.9) contrast(1.1) grayscale(100%)'
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
