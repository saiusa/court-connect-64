import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  KeyRound,
  History,
} from "lucide-react";

type Role = "admin" | "owner" | "user";
type SortKey = "name" | "joined" | "role";
type SortDir = "asc" | "desc";
type RoleFilter = "all" | Role | "no-role";

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

interface AuditRow {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  action: "grant" | "revoke" | "password_reset";
  role: Role | null;
  created_at: string;
}

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-destructive/15 text-destructive border-destructive/30",
  owner: "bg-accent/15 text-accent border-accent/30",
  user: "bg-muted text-muted-foreground border-border",
};

const ROLE_RANK: Record<Role | "none", number> = { admin: 3, owner: 2, user: 1, none: 0 };

export default function AdminUsers() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showAudit, setShowAudit] = useState(false);
  const [confirm, setConfirm] = useState<
    | { kind: "grant"; userId: string; role: Role; name: string }
    | { kind: "revoke"; userId: string; role: Role; name: string }
    | { kind: "reset"; userId: string; name: string }
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
    const [{ data: profs, error: pErr }, { data: rs, error: rErr }, { data: au, error: aErr }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id,display_name,phone,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
        supabase
          .from("admin_audit_log" as any)
          .select("id,admin_user_id,target_user_id,action,role,created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
    if (pErr) toast.error(pErr.message);
    if (rErr) toast.error(rErr.message);
    if (aErr && aErr.code !== "PGRST116") {
      // ignore "no rows" style errors silently
      console.warn("Audit fetch:", aErr.message);
    }
    setProfiles((profs as ProfileRow[]) || []);
    setRoles((rs as RoleRow[]) || []);
    setAudit(((au as unknown) as AuditRow[]) || []);
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

  const profileById = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const adminCount = useMemo(() => {
    let n = 0;
    rolesByUser.forEach((set) => {
      if (set.has("admin")) n++;
    });
    return n;
  }, [rolesByUser]);

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

  const topRole = (id: string): Role | "none" => {
    const set = rolesByUser.get(id);
    if (!set) return "none";
    if (set.has("admin")) return "admin";
    if (set.has("owner")) return "owner";
    if (set.has("user")) return "user";
    return "none";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = profiles.filter((p) => {
      if (q) {
        const haystack = [p.display_name, p.phone, p.id].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      const set = rolesByUser.get(p.id);
      switch (roleFilter) {
        case "all":
          return true;
        case "admin":
          return !!set?.has("admin");
        case "owner":
          return !!set?.has("owner");
        case "user":
          return !!set?.has("user") && !set?.has("admin") && !set?.has("owner");
        case "no-role":
          return !set || set.size === 0;
      }
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = (a.display_name || "").localeCompare(b.display_name || "");
      } else if (sortKey === "joined") {
        cmp = a.created_at.localeCompare(b.created_at);
      } else {
        cmp = ROLE_RANK[topRole(a.id)] - ROLE_RANK[topRole(b.id)];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, search, roleFilter, sortKey, sortDir, rolesByUser]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "joined" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="size-3.5 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
  };

  const grantRole = async (userId: string, role: Role) => {
    const { error } = await supabase.rpc("admin_grant_role", {
      _target_user_id: userId,
      _role: role,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Granted ${role}`);
    refresh();
  };

  const revokeRole = async (userId: string, role: Role) => {
    // Client-side guardrail that mirrors the DB safeguard so UX is clearer
    if (role === "admin" && adminCount <= 1) {
      toast.error("Cannot revoke the last remaining admin");
      return;
    }
    const { error } = await supabase.rpc("admin_revoke_role", {
      _target_user_id: userId,
      _role: role,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Revoked ${role}`);
    refresh();
  };

  const sendPasswordReset = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { target_user_id: userId },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if ((data as any)?.error) {
      toast.error((data as any).error);
      return;
    }
    toast.success("Password reset email sent");
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
            This area is restricted to platform administrators. If you believe this is a mistake,
            contact an existing admin to grant your account the role.
          </p>
          <Button onClick={() => navigate("/")}>Back to home</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const lastAdminGuard = (targetId: string) =>
    adminCount <= 1 && rolesByUser.get(targetId)?.has("admin");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <span className="text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Admin
            </span>
            <h1 className="font-display text-5xl md:text-6xl tracking-wider mt-1">
              Users &amp; Roles
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage who can sign in, run facilities, or administer the platform. All role changes
              are server-validated and recorded in the audit log.
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowAudit((v) => !v)}>
            <History className="size-4" />
            {showAudit ? "Hide audit log" : "View audit log"}
          </Button>
        </div>

        {/* Stat cards / Quick filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <FilterCard
            icon={Users}
            label="Total accounts"
            value={counts.total.toString()}
            active={roleFilter === "all"}
            onClick={() => setRoleFilter("all")}
          />
          <FilterCard
            icon={ShieldCheck}
            label="Admins"
            value={counts.admins.toString()}
            tone="destructive"
            active={roleFilter === "admin"}
            onClick={() => setRoleFilter("admin")}
          />
          <FilterCard
            icon={UserCog}
            label="Owners"
            value={counts.owners.toString()}
            tone="accent"
            active={roleFilter === "owner"}
            onClick={() => setRoleFilter("owner")}
          />
          <FilterCard
            icon={UserPlus}
            label="Users only"
            value={counts.users.toString()}
            active={roleFilter === "user"}
            onClick={() => setRoleFilter("user")}
          />
        </div>

        {/* Search + active filter chip */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative max-w-md flex-1 min-w-[240px]">
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
          {roleFilter !== "all" && (
            <Badge
              variant="outline"
              className="gap-1.5 cursor-pointer"
              onClick={() => setRoleFilter("all")}
            >
              Filter: {roleFilter}
              <XCircle className="size-3" />
            </Badge>
          )}
        </div>

        {/* Audit log panel */}
        {showAudit && (
          <section className="bg-card-gradient border border-border rounded-2xl p-5 shadow-card mb-8">
            <div className="flex items-center gap-2 mb-3">
              <History className="size-4 text-primary" />
              <h2 className="font-display text-2xl tracking-wider">Recent admin actions</h2>
              <span className="text-xs text-muted-foreground ml-auto">
                Last {audit.length} entries
              </span>
            </div>
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admin actions yet.</p>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.map((a) => {
                      const adminName =
                        profileById.get(a.admin_user_id)?.display_name ||
                        a.admin_user_id.slice(0, 8).toUpperCase();
                      const targetName =
                        profileById.get(a.target_user_id)?.display_name ||
                        a.target_user_id.slice(0, 8).toUpperCase();
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(parseISO(a.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-sm">{adminName}</TableCell>
                          <TableCell>
                            <span
                              className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded border ${
                                a.action === "grant"
                                  ? "bg-primary/15 text-primary border-primary/30"
                                  : a.action === "revoke"
                                  ? "bg-destructive/15 text-destructive border-destructive/30"
                                  : "bg-accent/15 text-accent border-accent/30"
                              }`}
                            >
                              {a.action === "password_reset"
                                ? "reset password"
                                : `${a.action} ${a.role ?? ""}`}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{targetName}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        )}

        {/* User table */}
        {filtered.length === 0 ? (
          <div className="bg-card-gradient border border-border rounded-2xl p-10 text-center text-muted-foreground">
            No users match your filters.
          </div>
        ) : (
          <div className="bg-card-gradient border border-border rounded-2xl shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("name")}
                      className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold hover:text-foreground transition-colors"
                    >
                      Name <SortIcon k="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("joined")}
                      className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold hover:text-foreground transition-colors"
                    >
                      Joined <SortIcon k="joined" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("role")}
                      className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold hover:text-foreground transition-colors"
                    >
                      Roles <SortIcon k="role" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const userRoles = rolesByUser.get(p.id) || new Set<Role>();
                  const isSelf = p.id === user?.id;
                  const isAdminUser = userRoles.has("admin");
                  const isOwnerUser = userRoles.has("owner");
                  const blockRevokeAdmin = isAdminUser && (isSelf || lastAdminGuard(p.id));
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">
                            {p.display_name || "Unnamed user"}
                          </span>
                          {isSelf && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                          <span className="font-mono opacity-70">
                            {p.id.slice(0, 8).toUpperCase()}
                          </span>
                          {p.phone && <span>{p.phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(parseISO(p.created_at), "PP")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {(["admin", "owner", "user"] as Role[]).map((r) =>
                            userRoles.has(r) ? (
                              <span
                                key={r}
                                className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded border ${ROLE_BADGE[r]}`}
                              >
                                {r}
                              </span>
                            ) : null,
                          )}
                          {userRoles.size === 0 && (
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              No roles
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {isOwnerUser ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setConfirm({
                                  kind: "revoke",
                                  userId: p.id,
                                  role: "owner",
                                  name: p.display_name || "this user",
                                })
                              }
                            >
                              <UserMinus className="size-4" /> Revoke owner
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setConfirm({
                                  kind: "grant",
                                  userId: p.id,
                                  role: "owner",
                                  name: p.display_name || "this user",
                                })
                              }
                            >
                              <UserPlus className="size-4" /> Make owner
                            </Button>
                          )}

                          {isAdminUser ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={blockRevokeAdmin}
                              title={
                                isSelf
                                  ? "You can't revoke your own admin role"
                                  : lastAdminGuard(p.id)
                                  ? "Cannot revoke the last remaining admin"
                                  : undefined
                              }
                              onClick={() =>
                                setConfirm({
                                  kind: "revoke",
                                  userId: p.id,
                                  role: "admin",
                                  name: p.display_name || "this user",
                                })
                              }
                            >
                              <ShieldAlert className="size-4" /> Revoke admin
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() =>
                                setConfirm({
                                  kind: "grant",
                                  userId: p.id,
                                  role: "admin",
                                  name: p.display_name || "this user",
                                })
                              }
                            >
                              <ShieldCheck className="size-4" /> Make admin
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirm({
                                kind: "reset",
                                userId: p.id,
                                name: p.display_name || "this user",
                              })
                            }
                          >
                            <KeyRound className="size-4" /> Reset password
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-6">
          Note: every account keeps the base <code>user</code> role. Granting <code>owner</code>{" "}
          unlocks the Owner Dashboard; granting <code>admin</code> additionally unlocks this page.
          The system always keeps at least one admin.
        </p>
      </main>

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "reset"
                ? "Send password reset email"
                : `${confirm?.kind === "grant" ? "Grant" : "Revoke"} ${
                    confirm && "role" in confirm ? confirm.role : ""
                  } role`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "reset"
                ? `Send a password reset email to ${confirm.name}? They will receive a secure link to choose a new password.`
                : confirm?.kind === "grant"
                ? `Give ${confirm.name} the ${confirm.role} role? They'll get access immediately on their next request.`
                : confirm?.kind === "revoke"
                ? `Remove the ${confirm.role} role from ${confirm.name}? They'll lose access immediately.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirm) return;
                if (confirm.kind === "grant") await grantRole(confirm.userId, confirm.role);
                else if (confirm.kind === "revoke") await revokeRole(confirm.userId, confirm.role);
                else if (confirm.kind === "reset") await sendPasswordReset(confirm.userId);
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

function FilterCard({
  icon: Icon,
  label,
  value,
  tone,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  value: string;
  tone?: "accent" | "destructive";
  active?: boolean;
  onClick?: () => void;
}) {
  const color =
    tone === "destructive" ? "text-destructive" : tone === "accent" ? "text-accent" : "text-primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-card-gradient border rounded-2xl p-5 shadow-card transition-all hover:border-primary/50 ${
        active ? "border-primary ring-2 ring-primary/40" : "border-border"
      }`}
    >
      <Icon className={`size-5 ${color} mb-2`} />
      <div className="font-display text-3xl tracking-wider">{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </button>
  );
}
