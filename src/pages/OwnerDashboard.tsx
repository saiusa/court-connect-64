import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatPHP } from "@/lib/format";
import { LayoutDashboard, Plus, Pencil, TrendingUp, CalendarCheck2, Wallet, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toCSV, downloadCSV } from "@/lib/csv";

interface Facility {
  id: string; name: string; sport_type: string; location: string;
  description: string | null; hourly_price: number; open_hour: number; close_hour: number;
  image_url: string | null; owner_id: string | null;
}

interface BookingRow {
  id: string; booking_date: string; start_hour: number; end_hour: number;
  total_price: number; status: string; facility_id: string;
}

const SPORTS = ["basketball", "badminton", "soccer", "tennis", "gym", "volleyball"];
const emptyForm: Partial<Facility> = {
  name: "", sport_type: "basketball", location: "Butuan City",
  description: "", hourly_price: 250, open_hour: 8, close_hour: 22, image_url: null,
};

export default function OwnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isOwner, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Facility> | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportFrom, setExportFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [exportTo, setExportTo] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => { document.title = "Owner Dashboard · Courtside"; }, []);

  useEffect(() => {
    if (authLoading || rolesLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (!isOwner) { setLoading(false); return; }
    refresh();
  }, [user, authLoading, rolesLoading, isOwner, navigate]);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { data: facs } = await supabase.from("facilities").select("*").eq("owner_id", user.id).order("name");
    const list = (facs as Facility[]) || [];
    setFacilities(list);
    if (list.length > 0) {
      const ids = list.map((f) => f.id);
      const { data: bks } = await supabase
        .from("bookings")
        .select("id,booking_date,start_hour,end_hour,total_price,status,facility_id")
        .in("facility_id", ids)
        .order("booking_date", { ascending: false });
      setBookings((bks as BookingRow[]) || []);
    } else {
      setBookings([]);
    }
    setLoading(false);
  };

  const stats = useMemo(() => {
    const paid = bookings.filter((b) => b.status === "paid" || b.status === "completed");
    const revenue = paid.reduce((s, b) => s + Number(b.total_price), 0);
    const upcoming = bookings.filter((b) => b.status !== "cancelled" && parseISO(b.booking_date) >= new Date(new Date().setHours(0, 0, 0, 0))).length;
    const totalHours = paid.reduce((s, b) => s + (b.end_hour - b.start_hour), 0);
    const occupancy = facilities.length > 0
      ? Math.min(100, Math.round((totalHours / (facilities.reduce((s, f) => s + (f.close_hour - f.open_hour), 0) * 30)) * 100))
      : 0;
    return { revenue, upcoming, totalBookings: bookings.length, occupancy };
  }, [bookings, facilities]);

  const chartData = useMemo(() => {
    const days: { date: string; bookings: number; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const todays = bookings.filter((b) => b.booking_date === d && b.status !== "cancelled");
      days.push({
        date: format(subDays(new Date(), i), "MMM d"),
        bookings: todays.length,
        revenue: todays.reduce((s, b) => s + Number(b.total_price), 0),
      });
    }
    return days;
  }, [bookings]);

  const sportBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    bookings.forEach((b) => {
      const f = facilities.find((x) => x.id === b.facility_id);
      if (!f) return;
      m.set(f.sport_type, (m.get(f.sport_type) || 0) + 1);
    });
    return Array.from(m.entries()).map(([sport, count]) => ({ sport, count }));
  }, [bookings, facilities]);

  const saveFacility = async () => {
    if (!user || !editing) return;
    if (!editing.name?.trim()) { toast.error("Name required"); return; }
    if ((editing.close_hour ?? 0) <= (editing.open_hour ?? 0)) { toast.error("Close hour must be after open hour"); return; }

    setSaving(true);
    const payload = {
      name: editing.name!.trim(),
      sport_type: editing.sport_type!,
      location: editing.location!,
      description: editing.description ?? null,
      hourly_price: Number(editing.hourly_price) || 0,
      open_hour: Number(editing.open_hour) || 8,
      close_hour: Number(editing.close_hour) || 22,
      image_url: editing.image_url ?? null,
      owner_id: user.id,
    };

    const { error } = editing.id
      ? await supabase.from("facilities").update(payload).eq("id", editing.id)
      : await supabase.from("facilities").insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing.id ? "Facility updated" : "Facility created");
    setEditing(null);
    refresh();
  };

  const exportBookingsCSV = () => {
    const from = parseISO(exportFrom);
    const to = parseISO(exportTo);
    if (to < from) { toast.error("End date must be after start date"); return; }
    const filtered = bookings.filter((b) => {
      const d = parseISO(b.booking_date);
      return d >= from && d <= to;
    });
    const rows = filtered.map((b) => {
      const f = facilities.find((x) => x.id === b.facility_id);
      return {
        booking_id: b.id,
        date: b.booking_date,
        start_hour: b.start_hour,
        end_hour: b.end_hour,
        hours: b.end_hour - b.start_hour,
        facility: f?.name || "",
        sport: f?.sport_type || "",
        status: b.status,
        amount_php: Number(b.total_price).toFixed(2),
      };
    });
    downloadCSV(`bookings_${exportFrom}_to_${exportTo}.csv`, toCSV(rows));
    toast.success(`Exported ${rows.length} booking${rows.length === 1 ? "" : "s"}`);
  };

  const exportRevenueCSV = () => {
    const from = parseISO(exportFrom);
    const to = parseISO(exportTo);
    if (to < from) { toast.error("End date must be after start date"); return; }
    const dayMap = new Map<string, { bookings: number; paid: number; revenue: number; cancelled: number }>();
    const days = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
    for (let i = 0; i < days; i++) {
      const d = format(subDays(to, days - 1 - i), "yyyy-MM-dd");
      dayMap.set(d, { bookings: 0, paid: 0, revenue: 0, cancelled: 0 });
    }
    bookings.forEach((b) => {
      const entry = dayMap.get(b.booking_date);
      if (!entry) return;
      entry.bookings += 1;
      if (b.status === "cancelled") entry.cancelled += 1;
      if (b.status === "paid" || b.status === "completed") {
        entry.paid += 1;
        entry.revenue += Number(b.total_price);
      }
    });
    const rows = Array.from(dayMap.entries()).map(([date, v]) => ({
      date,
      total_bookings: v.bookings,
      paid_bookings: v.paid,
      cancelled_bookings: v.cancelled,
      revenue_php: v.revenue.toFixed(2),
    }));
    downloadCSV(`revenue_${exportFrom}_to_${exportTo}.csv`, toCSV(rows));
    toast.success("Revenue analytics exported");
  };

  if (loading || authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar /><main className="flex-1 container py-20 text-center text-muted-foreground">Loading dashboard…</main><Footer />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-20 max-w-2xl text-center">
          <LayoutDashboard className="size-12 text-accent mx-auto mb-4" />
          <h1 className="font-display text-4xl tracking-wider mb-3">Owner access required</h1>
          <p className="text-muted-foreground mb-6">
            Your account isn't a registered facility owner yet. Owners are approved by an admin — once promoted, this dashboard unlocks instantly.
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
            <span className="text-xs uppercase tracking-widest text-accent font-bold">Owner</span>
            <h1 className="font-display text-5xl md:text-6xl tracking-wider mt-1">Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your Butuan City venues, hours, pricing and revenue.</p>
          </div>
          <Button size="lg" onClick={() => setEditing({ ...emptyForm })} className="font-bold tracking-wider">
            <Plus className="size-5" /> New facility
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard icon={Wallet} label="Total revenue" value={formatPHP(stats.revenue)} />
          <StatCard icon={CalendarCheck2} label="All-time bookings" value={stats.totalBookings.toString()} />
          <StatCard icon={TrendingUp} label="Upcoming" value={stats.upcoming.toString()} />
          <StatCard icon={LayoutDashboard} label="Est. occupancy" value={`${stats.occupancy}%`} />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-4 mb-10">
          <div className="lg:col-span-2 bg-card-gradient border border-border rounded-2xl p-5 shadow-card">
            <h3 className="font-display text-2xl tracking-wider mb-4">Bookings · last 14 days</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card-gradient border border-border rounded-2xl p-5 shadow-card">
            <h3 className="font-display text-2xl tracking-wider mb-4">By sport</h3>
            {sportBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {sportBreakdown.map((s) => {
                  const max = Math.max(...sportBreakdown.map((x) => x.count));
                  return (
                    <div key={s.sport}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{s.sport}</span>
                        <span className="font-bold">{s.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(s.count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Facilities list */}
        <h2 className="font-display text-3xl tracking-wider mb-4">Your facilities</h2>
        {facilities.length === 0 ? (
          <div className="bg-card-gradient border border-border rounded-2xl p-10 text-center">
            <p className="text-muted-foreground mb-4">You haven't listed any facilities yet.</p>
            <Button onClick={() => setEditing({ ...emptyForm })}><Plus className="size-4" /> Create your first facility</Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {facilities.map((f) => {
              const fBookings = bookings.filter((b) => b.facility_id === f.id);
              const fRevenue = fBookings.filter((b) => b.status === "paid" || b.status === "completed").reduce((s, b) => s + Number(b.total_price), 0);
              return (
                <div key={f.id} className="bg-card-gradient border border-border rounded-2xl p-5 shadow-card grid sm:grid-cols-[1fr_auto_auto] gap-4 items-center">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-accent font-bold">{f.sport_type}</span>
                    <h3 className="font-display text-2xl tracking-wider">{f.name}</h3>
                    <p className="text-xs text-muted-foreground">{f.location} · {f.open_hour}:00–{f.close_hour}:00 · {formatPHP(f.hourly_price)}/hr</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Revenue</div>
                    <div className="font-bold text-accent text-lg">{formatPHP(fRevenue)}</div>
                    <div className="text-xs text-muted-foreground">{fBookings.length} booking{fBookings.length === 1 ? "" : "s"}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditing(f)}>
                    <Pencil className="size-4" /> Edit
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit dialog */}
        <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-3xl tracking-wider">
                {editing?.id ? "Edit facility" : "New facility"}
              </DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Name</Label>
                  <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Sport</Label>
                    <Select value={editing.sport_type} onValueChange={(v) => setEditing({ ...editing, sport_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SPORTS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Hourly price (₱)</Label>
                    <Input type="number" min={0} value={editing.hourly_price ?? 0} onChange={(e) => setEditing({ ...editing, hourly_price: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={editing.location || ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Opens at</Label>
                    <Input type="number" min={0} max={23} value={editing.open_hour ?? 8} onChange={(e) => setEditing({ ...editing, open_hour: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Closes at</Label>
                    <Input type="number" min={1} max={24} value={editing.close_hour ?? 22} onChange={(e) => setEditing({ ...editing, close_hour: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={3} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </div>
                <Button onClick={saveFacility} disabled={saving} size="lg" className="w-full font-bold tracking-wider">
                  {saving ? "Saving…" : editing.id ? "Save changes" : "Create facility"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-card-gradient border border-border rounded-2xl p-5 shadow-card">
      <Icon className="size-5 text-accent mb-2" />
      <div className="font-display text-3xl tracking-wider text-gradient">{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
