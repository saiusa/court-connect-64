import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Clock, XCircle, Building2 } from "lucide-react";

const appSchema = z.object({
  business_name: z.string().trim().min(2).max(120),
  contact_name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email().max(255),
  contact_phone: z.string().trim().min(5).max(40),
  facility_type: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

type Checklist = {
  profile_complete: boolean;
  first_facility_added: boolean;
  payout_info_added: boolean;
  reviewed_terms: boolean;
};

const CHECKLIST_LABELS: Record<keyof Checklist, string> = {
  profile_complete: "Complete your profile (display name & phone)",
  first_facility_added: "Add your first facility listing",
  payout_info_added: "Provide payout / contact info to support",
  reviewed_terms: "Review the partner terms & commission policy",
};

export default function PartnerOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const { isOwner, loading: rolesLoading } = useRoles();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<any>(null);

  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    facility_type: "",
    location: "",
    description: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, contact_email: user.email ?? "" }));
    (async () => {
      const { data } = await supabase
        .from("partner_applications")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setApplication(data);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading || rolesLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = appSchema.safeParse(form);
    if (!parsed.success) {
      toast.error("Please correct the highlighted fields");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("partner_applications")
      .insert({
        business_name: parsed.data.business_name,
        contact_name: parsed.data.contact_name,
        contact_email: parsed.data.contact_email,
        contact_phone: parsed.data.contact_phone,
        facility_type: parsed.data.facility_type,
        location: parsed.data.location,
        description: parsed.data.description || null,
        user_id: user.id,
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setApplication(data);
    toast.success("Application submitted — we'll review it shortly");
  };

  const updateChecklist = async (key: keyof Checklist, value: boolean) => {
    if (!application) return;
    const next = { ...(application.checklist as Checklist), [key]: value };
    const { data, error } = await supabase
      .from("partner_applications")
      .update({ checklist: next })
      .eq("id", application.id)
      .select()
      .single();
    if (error) return toast.error(error.message);
    setApplication(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-3xl py-10">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="size-8 text-accent" />
          <div>
            <h1 className="font-display text-3xl tracking-wide">Become a Partner</h1>
            <p className="text-sm text-muted-foreground">
              List your facility on Courtside and start accepting bookings.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : application ? (
          <ApplicationStatus
            application={application}
            isOwner={isOwner}
            onChecklistChange={updateChecklist}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Partner application</CardTitle>
              <CardDescription>
                Tell us about your facility. Approval typically takes 1–2 business days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Business name" value={form.business_name}
                    onChange={(v) => setForm({ ...form, business_name: v })} />
                  <Field label="Facility type" placeholder="e.g. Basketball court, Gym"
                    value={form.facility_type}
                    onChange={(v) => setForm({ ...form, facility_type: v })} />
                  <Field label="Contact name" value={form.contact_name}
                    onChange={(v) => setForm({ ...form, contact_name: v })} />
                  <Field label="Contact phone" value={form.contact_phone}
                    onChange={(v) => setForm({ ...form, contact_phone: v })} />
                  <Field label="Contact email" type="email" value={form.contact_email}
                    onChange={(v) => setForm({ ...form, contact_email: v })} />
                  <Field label="Location" value={form.location}
                    onChange={(v) => setForm({ ...form, location: v })} />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Hours, amenities, what makes your venue great…"
                  />
                </div>
                <Button type="submit" className="btn-court" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit application"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}

function ApplicationStatus({
  application, isOwner, onChecklistChange,
}: {
  application: any;
  isOwner: boolean;
  onChecklistChange: (k: keyof Checklist, v: boolean) => void;
}) {
  const status: "pending" | "approved" | "rejected" = application.status;
  const checklist = application.checklist as Checklist;
  const total = Object.keys(CHECKLIST_LABELS).length;
  const done = Object.values(checklist).filter(Boolean).length;
  const pct = Math.round((done / total) * 100);

  const statusUI = {
    pending: { icon: Clock, label: "Pending review", variant: "secondary" as const },
    approved: { icon: CheckCircle2, label: "Approved", variant: "default" as const },
    rejected: { icon: XCircle, label: "Rejected", variant: "destructive" as const },
  }[status];
  const StatusIcon = statusUI.icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{application.business_name}</CardTitle>
              <CardDescription>{application.location}</CardDescription>
            </div>
            <Badge variant={statusUI.variant} className="gap-1">
              <StatusIcon className="size-3.5" />
              {statusUI.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <Info label="Type" value={application.facility_type} />
            <Info label="Contact" value={application.contact_name} />
            <Info label="Email" value={application.contact_email} />
            <Info label="Phone" value={application.contact_phone} />
          </div>
          {application.review_notes && (
            <div className="mt-3 p-3 rounded-md bg-muted/50 border">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Reviewer notes
              </div>
              <p>{application.review_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {status === "approved" && (
        <Card>
          <CardHeader>
            <CardTitle>Onboarding checklist</CardTitle>
            <CardDescription>
              Complete these steps to start receiving bookings.
            </CardDescription>
            <Progress value={pct} className="mt-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {done} of {total} complete
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(CHECKLIST_LABELS) as Array<keyof Checklist>).map((key) => (
              <label
                key={key}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={!!checklist[key]}
                  onCheckedChange={(v) => onChecklistChange(key, !!v)}
                  className="mt-0.5"
                />
                <span className={checklist[key] ? "line-through text-muted-foreground" : ""}>
                  {CHECKLIST_LABELS[key]}
                </span>
              </label>
            ))}
            {isOwner && (
              <p className="text-sm text-muted-foreground pt-2">
                ✅ Your owner account is active — head to the{" "}
                <a href="/owner" className="text-accent underline">Owner Dashboard</a>.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {status === "pending" && (
        <Card className="empty-court">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Clock className="size-10 mx-auto mb-3 text-accent" />
            <p>We're reviewing your application. You'll get access as soon as it's approved.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}
