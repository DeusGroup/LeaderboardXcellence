import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Trophy, User, Settings } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <Trophy className="h-6 w-6" />
            <span className="font-bold">IT Performance</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
            <Button
              variant={location === "/" ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link href="/">Leaderboard</Link>
            </Button>
            {location !== "/login" && (
              <Button
                variant={location.startsWith("/admin") ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link href="/admin">
                  <Settings className="mr-2 h-4 w-4" />
                  Admin Panel
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
