import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Clock, XCircle, Building2 } from "lucide-react";

type Status = "pending" | "approved" | "rejected";

export default function AdminPartners() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | Status>("pending");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("partner_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setApps(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin]);

  if (authLoading || rolesLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const filtered = filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const counts = {
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-5xl py-10">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="size-8 text-accent" />
          <div>
            <h1 className="font-display text-3xl tracking-wide">Partner applications</h1>
            <p className="text-sm text-muted-foreground">
              Review owner applications and provision accounts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {(["all", "pending", "approved", "rejected"] as const).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={filter === k ? "default" : "outline"}
              onClick={() => setFilter(k)}
              className="capitalize"
            >
              {k}
              {k !== "all" && (
                <Badge variant="secondary" className="ml-2">
                  {counts[k]}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <Card className="empty-court">
            <CardContent className="py-12 text-center text-muted-foreground">
              No applications match this filter.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((a) => (
              <ApplicationRow key={a.id} app={a} onChanged={load} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ApplicationRow({ app, onChanged }: { app: any; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  const review = async (approve: boolean) => {
    setBusy(approve ? "approve" : "reject");
    const { error } = await supabase.rpc("admin_review_partner_application", {
      _application_id: app.id,
      _approve: approve,
      _notes: notes || null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved & owner role granted" : "Application rejected");
    setOpen(false);
    onChanged();
  };

  const status: Status = app.status;
  const statusUI = {
    pending: { icon: Clock, variant: "secondary" as const, label: "Pending" },
    approved: { icon: CheckCircle2, variant: "default" as const, label: "Approved" },
    rejected: { icon: XCircle, variant: "destructive" as const, label: "Rejected" },
  }[status];
  const Icon = statusUI.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{app.business_name}</CardTitle>
            <CardDescription>
              {app.facility_type} · {app.location}
            </CardDescription>
          </div>
          <Badge variant={statusUI.variant} className="gap-1">
            <Icon className="size-3.5" />
            {statusUI.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-2 text-sm mb-3">
          <div><span className="text-muted-foreground">Contact:</span> {app.contact_name}</div>
          <div><span className="text-muted-foreground">Email:</span> {app.contact_email}</div>
          <div><span className="text-muted-foreground">Phone:</span> {app.contact_phone}</div>
          <div><span className="text-muted-foreground">Submitted:</span>{" "}
            {new Date(app.created_at).toLocaleDateString()}</div>
        </div>
        {app.description && (
          <p className="text-sm text-muted-foreground mb-3">{app.description}</p>
        )}
        {app.review_notes && (
          <div className="text-sm p-2 rounded border bg-muted/40 mb-3">
            <span className="text-xs uppercase text-muted-foreground">Notes:</span> {app.review_notes}
          </div>
        )}

        {status === "pending" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="btn-court">Review</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Review {app.business_name}</DialogTitle>
                <DialogDescription>
                  Approving will automatically grant the owner role and unlock the dashboard.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Optional notes for the applicant…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <DialogFooter className="gap-2">
                <Button
                  variant="destructive"
                  disabled={!!busy}
                  onClick={() => review(false)}
                >
                  {busy === "reject" ? "Rejecting…" : "Reject"}
                </Button>
                <Button
                  className="btn-court"
                  disabled={!!busy}
                  onClick={() => review(true)}
                >
                  {busy === "approve" ? "Approving…" : "Approve & provision"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
