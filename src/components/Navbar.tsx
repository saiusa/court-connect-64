import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import {
  LogOut,
  CalendarCheck,
  LayoutDashboard,
  Bell,
  Menu,
  Home,
  Building2,
  ShieldCheck,
} from "lucide-react";
import courtsideLogo from "@/assets/courtside-logo.png";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  show: boolean;
}

export function Navbar() {
  const { user, signOut } = useAuth();
  const { isOwner, isAdmin } = useRoles();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isHome = pathname === "/";

  const navItems: NavItem[] = [
    { to: "/", label: "Home", icon: Home, show: true },
    { to: "/facilities", label: "Facilities", icon: Building2, show: true },
    { to: "/my-bookings", label: "My Bookings", icon: CalendarCheck, show: !!user },
    { to: "/reminders", label: "Reminders", icon: Bell, show: !!user },
    { to: "/owner", label: "Dashboard", icon: LayoutDashboard, show: !!user && isOwner },
    { to: "/admin/users", label: "Admin", icon: ShieldCheck, show: !!user && isAdmin },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-3">
        {/* Logo — always navigates home, active state on landing */}
        <Link
          to="/"
          aria-label="Courtside — go to home"
          aria-current={isHome ? "page" : undefined}
          className={`flex items-center group rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            isHome ? "ring-1 ring-accent/40" : ""
          }`}
        >
          <img
            src={courtsideLogo}
            alt="Courtside"
            width={160}
            height={40}
            decoding="async"
            fetchPriority="high"
            className="h-9 sm:h-10 w-auto group-hover:scale-105 transition-transform dark:brightness-0 dark:invert"
            style={{ imageRendering: "auto" }}
          />
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 font-medium text-sm uppercase tracking-wider"
        >
          {navItems
            .filter((i) => i.show)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `relative py-1 transition-colors ${
                    isActive
                      ? "text-accent after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-0.5 after:bg-accent after:rounded-full"
                      : "text-foreground/80 hover:text-primary"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                  aria-label="Sign out of your account"
                >
                  <LogOut className="size-4" />
                  <span>Sign out</span>
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/auth")}
              aria-label="Sign in to your account"
              className="hidden md:inline-flex"
            >
              Sign in
            </Button>
          )}

          {/* Mobile burger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation menu"
                aria-expanded={open}
                aria-controls="mobile-nav"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent id="mobile-nav" side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl tracking-widest text-left">
                  COURTSIDE
                </SheetTitle>
              </SheetHeader>

              <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">
                {navItems
                  .filter((i) => i.show)
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <SheetClose asChild key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.to === "/"}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-3 rounded-lg text-sm uppercase tracking-wider transition-colors ${
                              isActive
                                ? "bg-accent/15 text-accent border border-accent/30"
                                : "text-foreground/80 hover:bg-muted hover:text-foreground"
                            }`
                          }
                        >
                          <Icon className="size-4" />
                          {item.label}
                        </NavLink>
                      </SheetClose>
                    );
                  })}
              </nav>

              <div className="mt-6 pt-6 border-t border-border">
                {user ? (
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        await signOut();
                        navigate("/");
                      }}
                    >
                      <LogOut className="size-4" /> Sign out
                    </Button>
                  </SheetClose>
                ) : (
                  <SheetClose asChild>
                    <Button className="w-full" onClick={() => navigate("/auth")}>
                      Sign in
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
