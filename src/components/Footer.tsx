import { Trophy } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="container py-12 grid md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
              <Trophy className="size-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl tracking-widest">COURTSIDE</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Book local sports facilities in seconds. Courts, pitches, gyms — all in one place.
          </p>
        </div>
        <div>
          <h4 className="font-display text-lg tracking-wider mb-3">Platform</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Browse facilities</li>
            <li>Manage bookings</li>
            <li>For facility owners</li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-lg tracking-wider mb-3">Contact</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>support@courtside.app</li>
            <li>Mon–Sun · 8am–10pm</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Courtside. All rights reserved.
      </div>
    </footer>
  );
}
