import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, LogOut, CalendarCheck } from "lucide-react";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center shadow-glow group-hover:scale-105 transition-transform">
            <Trophy className="size-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl tracking-widest">COURTSIDE</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 font-medium text-sm uppercase tracking-wider">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <Link to="/facilities" className="hover:text-primary transition-colors">Facilities</Link>
          {user && <Link to="/my-bookings" className="hover:text-primary transition-colors">My Bookings</Link>}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/my-bookings")}>
                <CalendarCheck className="size-4" />
                <span className="hidden sm:inline">Bookings</span>
              </Button>
              <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
