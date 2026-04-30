import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Search, UserCog, UserMinus, UserPlus, Users, XCircle } from "lucide-react";

type Role = "admin" | "owner" | "user";

interface ProfileRow {
  id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: Role;
}

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-destructive/15 text-destructive border-destructive/30",
  owner: "bg-accent/15 text-accent border-accent/30",
  user: "bg-muted text-muted-foreground border-border",
};

export default function AdminUsers() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<
    | { kind: "grant"; userId: string; role: Role; name: string }
    | { kind: "revoke"; userId: string; role: Role; name: string }
    | null
  >(null);

  useEffect(() => {
    document.title = "Admin · Users · Courtside";
  }, []);

  useEffect(() => {
    if (authLoading || rolesLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, rolesLoading, isAdmin]);

  const refresh = async () => {
    setLoading(true);
    const [{ data: profs, error: pErr }, { data: rs, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id,display_name,phone,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    if (pErr) toast.error(pErr.message);
    if (rErr) toast.error(rErr.message);
    setProfiles((profs as ProfileRow[]) || []);
    setRoles((rs as RoleRow[]) || []);
    setLoading(false);
  };

  const rolesByUser = useMemo(() => {
    const m = new Map<string, Set<Role>>();
    roles.forEach((r) => {
      const set = m.get(r.user_id) || new Set<Role>();
      set.add(r.role);
      m.set(r.user_id, set);
    });
    return m;
  }, [roles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const haystack = [p.display_name, p.phone, p.id].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [profiles, search]);

  const counts = useMemo(() => {
    let admins = 0,
      owners = 0,
      users = 0;
    rolesByUser.forEach((set) => {
      if (set.has("admin")) admins++;
      if (set.has("owner")) owners++;
      if (set.has("user") && !set.has("admin") && !set.has("owner")) users++;
    });
    return { admins, owners, users, total: profiles.length };
  }, [rolesByUser, profiles.length]);

  const grantRole = async (userId: string, role: Role) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Granted ${role}`);
    refresh();
  };

  const revokeRole = async (userId: string, role: Role) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Revoked ${role}`);
    refresh();
  };

  if (authLoading || rolesLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-20 text-center text-muted-foreground">Loading admin…</main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-20 max-w-2xl text-center">
          <ShieldAlert className="size-12 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-4xl tracking-wider mb-3">Admin access required</h1>
          <p className="text-muted-foreground mb-6">
            This area is restricted to platform administrators. If you believe this is a mistake, contact an existing admin to grant your account the role.
          </p>
          <Button onClick={() => navigate("/")}>Back to home</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <span className="text-xs uppercase tracking-widest text-destructive font-bold flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Admin
            </span>
            <h1 className="font-display text-5xl md:text-6xl tracking-wider mt-1">Users &amp; Roles</h1>
            <p className="text-muted-foreground mt-2">
              Manage who can sign in, run facilities, or administer the platform. Role changes take effect immediately.
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Total accounts" value={counts.total.toString()} />
          <StatCard icon={ShieldCheck} label="Admins" value={counts.admins.toString()} tone="destructive" />
          <StatCard icon={UserCog} label="Owners" value={counts.owners.toString()} tone="accent" />
          <StatCard icon={UserPlus} label="Users only" value={counts.users.toString()} />
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or user ID…"
            className="pl-9 pr-9"
            aria-label="Search users"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <XCircle className="size-4" />
            </button>
          )}
        </div>

        {/* User list */}
        {filtered.length === 0 ? (
          <div className="bg-card-gradient border border-border rounded-2xl p-10 text-center text-muted-foreground">
            No users match your search.
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((p) => {
              const userRoles = rolesByUser.get(p.id) || new Set<Role>();
              const isSelf = p.id === user?.id;
              const isAdminUser = userRoles.has("admin");
              const isOwnerUser = userRoles.has("owner");
              return (
                <div
                  key={p.id}
                  className="bg-card-gradient border border-border rounded-2xl p-4 shadow-card grid md:grid-cols-[1fr_auto_auto] gap-4 items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-xl tracking-wider truncate">
                        {p.display_name || "Unnamed user"}
                      </h3>
                      {isSelf && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-widest">You</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="font-mono opacity-70">{p.id.slice(0, 8).toUpperCase()}</span>
                      {p.phone && <span>{p.phone}</span>}
                      <span>Joined {format(parseISO(p.created_at), "PP")}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(["admin", "owner", "user"] as Role[]).map((r) => {
                      const has = userRoles.has(r);
                      if (!has) return null;
                      return (
                        <span
                          key={r}
                          className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded border ${ROLE_BADGE[r]}`}
                        >
                          {r}
                        </span>
                      );
                    })}
                    {userRoles.size === 0 && (
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">No roles</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                    {/* Owner toggle */}
                    {isOwnerUser ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirm({ kind: "revoke", userId: p.id, role: "owner", name: p.display_name || "this user" })}
                      >
                        <UserMinus className="size-4" /> Revoke owner
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirm({ kind: "grant", userId: p.id, role: "owner", name: p.display_name || "this user" })}
                      >
                        <UserPlus className="size-4" /> Make owner
                      </Button>
                    )}

                    {/* Admin toggle (locked for self) */}
                    {isAdminUser ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isSelf}
                        onClick={() => setConfirm({ kind: "revoke", userId: p.id, role: "admin", name: p.display_name || "this user" })}
                        title={isSelf ? "You can't revoke your own admin role" : undefined}
                      >
                        <ShieldAlert className="size-4" /> Revoke admin
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setConfirm({ kind: "grant", userId: p.id, role: "admin", name: p.display_name || "this user" })}
                      >
                        <ShieldCheck className="size-4" /> Make admin
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-6">
          Note: every account keeps the base <code>user</code> role. Granting <code>owner</code> unlocks the Owner Dashboard;
          granting <code>admin</code> additionally unlocks this page.
        </p>
      </main>

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "grant" ? "Grant" : "Revoke"} {confirm?.role} role
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "grant"
                ? `Give ${confirm?.name} the ${confirm?.role} role? They'll get access immediately on their next request.`
                : `Remove the ${confirm?.role} role from ${confirm?.name}? They'll lose access immediately.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirm) return;
                if (confirm.kind === "grant") await grantRole(confirm.userId, confirm.role);
                else await revokeRole(confirm.userId, confirm.role);
                setConfirm(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone?: "accent" | "destructive";
}) {
  const color = tone === "destructive" ? "text-destructive" : tone === "accent" ? "text-accent" : "text-primary";
  return (
    <div className="bg-card-gradient border border-border rounded-2xl p-5 shadow-card">
      <Icon className={`size-5 ${color} mb-2`} />
      <div className="font-display text-3xl tracking-wider">{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
