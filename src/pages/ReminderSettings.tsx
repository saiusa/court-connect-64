import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Mail, BellOff, Smartphone } from "lucide-react";

interface Reminder {
  id: string;
  minutes_before: number;
  label: string;
  enabled: boolean;
}

type Channel = "in_app" | "email";

const PRESETS = [
  { label: "15 minutes", minutes: 15 },
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "3 hours", minutes: 180 },
  { label: "12 hours", minutes: 720 },
  { label: "1 day", minutes: 1440 },
  { label: "2 days", minutes: 2880 },
  { label: "1 week", minutes: 10080 },
];

const formatLeadTime = (m: number) => {
  if (m < 60) return `${m} min before`;
  if (m < 1440) return `${m / 60} hr before`;
  if (m < 10080) return `${m / 1440} day${m === 1440 ? "" : "s"} before`;
  return `${m / 10080} week before`;
};

export default function ReminderSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPreset, setNewPreset] = useState("60");
  const [newLabel, setNewLabel] = useState("");
  const [channel, setChannel] = useState<Channel>("in_app");
  const [mainEnabled, setMainEnabled] = useState(true);

  useEffect(() => { document.title = "Reminders · Courtside"; }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const refresh = async () => {
    if (!user) return;
    const [{ data: rems }, { data: prof }] = await Promise.all([
      supabase.from("reminder_preferences").select("id,minutes_before,label,enabled").eq("user_id", user.id).order("minutes_before"),
      supabase.from("profiles").select("reminder_channel,reminders_enabled").eq("id", user.id).maybeSingle(),
    ]);
    setReminders((rems as Reminder[]) || []);
    if (prof) {
      setChannel(((prof as any).reminder_channel as Channel) || "in_app");
      setMainEnabled((prof as any).reminders_enabled ?? true);
    }
    setLoading(false);
  };

  const updateChannel = async (next: Channel) => {
    if (!user) return;
    setChannel(next);
    const { error } = await supabase.from("profiles").update({ reminder_channel: next }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success(`Delivery set to ${next === "in_app" ? "in-app" : "email"}`);
  };

  const updateMaster = async (next: boolean) => {
    if (!user) return;
    setMainEnabled(next);
    const { error } = await supabase.from("profiles").update({ reminders_enabled: next }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "All reminders enabled" : "All reminders paused");
  };

  const addReminder = async () => {
    if (!user) return;
    const minutes = Number(newPreset);
    if (reminders.some((r) => r.minutes_before === minutes)) {
      toast.error("Reminder already exists");
      return;
    }
    const { error } = await supabase.from("reminder_preferences").insert({
      user_id: user.id,
      minutes_before: minutes,
      label: newLabel.trim() || formatLeadTime(minutes),
      enabled: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Reminder added");
    setNewLabel("");
    refresh();
  };

  const toggle = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from("reminder_preferences").update({ enabled }).eq("id", id);
    if (error) return toast.error(error.message);
    setReminders((rs) => rs.map((r) => (r.id === id ? { ...r, enabled } : r)));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("reminder_preferences").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setReminders((rs) => rs.filter((r) => r.id !== id));
    toast.success("Reminder removed");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="size-6 text-accent" />
          <span className="text-xs uppercase tracking-widest text-accent font-bold">Notifications</span>
        </div>
        <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-3">Reminders</h1>
        <p className="text-muted-foreground text-lg mb-8">
          Choose when we should remind you about upcoming bookings and team series. You can enable as many lead times as you'd like.
        </p>

        {/* Master switch + delivery channel — always visible (sticky) */}
        <section className="sticky top-4 z-10 bg-card-gradient/95 backdrop-blur border border-border rounded-2xl p-5 shadow-card mb-6">
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
            <div className="flex gap-3">
              {mainEnabled ? <Bell className="size-5 text-accent mt-1" /> : <BellOff className="size-5 text-muted-foreground mt-1" />}
              <div>
                <h2 className="font-display text-2xl tracking-wider">All reminders</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Master switch — pauses every reminder below without losing your settings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={mainEnabled} onCheckedChange={updateMaster} aria-label="Master reminders toggle" />
              <span className="text-xs text-muted-foreground w-12">{mainEnabled ? "On" : "Off"}</span>
            </div>
          </div>

          <div className="pt-5">
            <Label className="mb-2 block">Delivery method</Label>
            <Select value={channel} onValueChange={(v) => updateChannel(v as Channel)} disabled={!mainEnabled}>
              <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_app">
                  <div className="flex items-center gap-2"><Smartphone className="size-4" /> In-app notifications</div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2"><Mail className="size-4" /> Email (coming soon)</div>
                </SelectItem>
              </SelectContent>
            </Select>
            {channel === "email" && mainEnabled && (
              <p className="text-xs text-muted-foreground mt-2">
                Email delivery isn't connected yet — your preference is saved and will start sending once the sender domain is configured.
              </p>
            )}
            {!mainEnabled && (
              <p className="text-xs text-muted-foreground mt-2">
                All reminders are paused. Turn the master switch on to resume delivery and re-enable the controls below.
              </p>
            )}
          </div>
        </section>

        <section className={`bg-card-gradient border border-border rounded-2xl p-5 shadow-card mb-6 ${!mainEnabled ? "opacity-50 pointer-events-none" : ""}`}>
          <h2 className="font-display text-2xl tracking-wider mb-4">Add a reminder</h2>
          <div className="grid sm:grid-cols-[200px_1fr_auto] gap-3 items-end">
            <div>
              <Label>Lead time</Label>
              <Select value={newPreset} onValueChange={setNewPreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => <SelectItem key={p.minutes} value={String(p.minutes)}>{p.label} before</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Pre-game heads up" />
            </div>
            <Button onClick={addReminder} className="font-bold tracking-wider">
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl tracking-wider mb-4">Active reminders</h2>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading…</div>
          ) : reminders.length === 0 ? (
            <div className="bg-card-gradient border border-border rounded-2xl p-10 text-center text-muted-foreground">
              No reminders yet. Add one above to start receiving alerts before each booking.
            </div>
          ) : (
            <div className={`grid gap-3 ${!mainEnabled ? "opacity-50" : ""}`}>
              {reminders.map((r) => (
                <div key={r.id} className="bg-card-gradient border border-border rounded-2xl p-4 shadow-card flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-display text-xl tracking-wider">{formatLeadTime(r.minutes_before)}</div>
                    {r.label && r.label !== formatLeadTime(r.minutes_before) && (
                      <div className="text-xs text-muted-foreground mt-1">{r.label}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={r.enabled} onCheckedChange={(v) => toggle(r.id, v)} disabled={!mainEnabled} />
                      <span className="text-xs text-muted-foreground w-12">{r.enabled ? "On" : "Off"}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => remove(r.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
