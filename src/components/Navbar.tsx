import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { LogOut, CalendarCheck, LayoutDashboard, Bell } from "lucide-react";
import courtsideLogo from "@/assets/courtside-logo.png";

export function Navbar() {
  const { user, signOut } = useAuth();
  const { isOwner } = useRoles();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center group" aria-label="Courtside home">
          <img
            src={courtsideLogo}
            alt="Courtside"
            className="h-10 w-auto group-hover:scale-105 transition-transform"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8 font-medium text-sm uppercase tracking-wider">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <Link to="/facilities" className="hover:text-primary transition-colors">Facilities</Link>
          {user && <Link to="/my-bookings" className="hover:text-primary transition-colors">My Bookings</Link>}
          {user && <Link to="/reminders" className="hover:text-primary transition-colors">Reminders</Link>}
          {isOwner && <Link to="/owner" className="hover:text-primary transition-colors">Dashboard</Link>}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {isOwner && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/owner")}>
                  <LayoutDashboard className="size-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate("/my-bookings")}>
                <CalendarCheck className="size-4" />
                <span className="hidden sm:inline">Bookings</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/reminders")}>
                <Bell className="size-4" />
                <span className="hidden sm:inline">Reminders</span>
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
