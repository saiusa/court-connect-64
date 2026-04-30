import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolveFacilityImage } from "@/lib/facility-images";
import { formatPHP } from "@/lib/format";
import { BookingTimeline, type BookingStatus } from "@/components/BookingTimeline";
import { PaymentDialog } from "@/components/PaymentDialog";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, X, CreditCard, Users, Receipt, Search, StickyNote, XCircle, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { downloadReceipt } from "@/lib/receipt";

interface Booking {
  id: string;
  booking_date: string;
  start_hour: number;
  end_hour: number;
  total_price: number;
  status: BookingStatus;
  series_id: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  owner_notes: string | null;
  facilities: {
    id: string;
    name: string;
    sport_type: string;
    location: string;
    image_url: string | null;
  } | null;
}

type FilterStatus = "all" | "pending" | "paid" | "completed" | "cancelled";

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function MyBookings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [payTarget, setPayTarget] = useState<{ ids: string[]; amount: number } | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [customerName, setCustomerName] = useState<string>("");
  // Advanced filters
  const [advBookingId, setAdvBookingId] = useState("");
  const [advFacility, setAdvFacility] = useState("__any__");
  const [advFrom, setAdvFrom] = useState("");
  const [advTo, setAdvTo] = useState("");

  useEffect(() => { document.title = "My Bookings · Courtside"; }, []);

  const refresh = () => {
    if (!user) return;
    supabase
      .from("bookings")
      .select("id,booking_date,start_hour,end_hour,total_price,status,series_id,payment_ref,paid_at,owner_notes,facilities(id,name,sport_type,location,image_url)")
      .eq("user_id", user.id)
      .order("booking_date", { ascending: false })
      .then(({ data }) => {
        setBookings((data as any as Booking[]) || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    refresh();
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setCustomerName(data?.display_name || user.email || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, navigate]);

  const cancelBooking = async (id: string) => {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    setBookings((b) => b.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x)));
    toast.success("Booking cancelled");
  };

  // Apply filter + search + advanced filters
  const filteredBookings = useMemo(() => {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const q = search.trim().toLowerCase();
    const idQuery = advBookingId.trim().toLowerCase().replace(/^#/, "");
    const fromD = advFrom ? parseISO(advFrom) : null;
    const toD = advTo ? parseISO(advTo) : null;
    return bookings.filter((b) => {
      const isPast = parseISO(b.booking_date) < today;
      const displayStatus: BookingStatus = b.status === "paid" && isPast ? "completed" : b.status;
      if (filter !== "all" && displayStatus !== filter) return false;

      // Exact booking ID match (full UUID or 8-char short id)
      if (idQuery) {
        const full = b.id.toLowerCase();
        const short = b.id.slice(0, 8).toLowerCase();
        if (full !== idQuery && short !== idQuery) return false;
      }
      // Exact facility name match
      if (advFacility !== "__any__" && b.facilities?.name !== advFacility) return false;
      // Date range
      const bd = parseISO(b.booking_date);
      if (fromD && bd < fromD) return false;
      if (toD && bd > toD) return false;

      if (!q) return true;
      const haystack = [
        b.id,
        b.id.slice(0, 8),
        b.facilities?.name,
        b.facilities?.sport_type,
        b.facilities?.location,
        b.booking_date,
        format(parseISO(b.booking_date), "PPP").toLowerCase(),
        format(parseISO(b.booking_date), "MMM d yyyy").toLowerCase(),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [bookings, filter, search, advBookingId, advFacility, advFrom, advTo]);

  const grouped = useMemo(() => {
    const series = new Map<string, Booking[]>();
    const single: Booking[] = [];
    filteredBookings.forEach((b) => {
      if (b.series_id) {
        const arr = series.get(b.series_id) || [];
        arr.push(b);
        series.set(b.series_id, arr);
      } else single.push(b);
    });
    return { series: Array.from(series.entries()), single };
  }, [filteredBookings]);

  const counts = useMemo(() => {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const c: Record<FilterStatus, number> = { all: bookings.length, pending: 0, paid: 0, completed: 0, cancelled: 0 };
    bookings.forEach((b) => {
      const isPast = parseISO(b.booking_date) < today;
      const s: BookingStatus = b.status === "paid" && isPast ? "completed" : b.status;
      c[s as FilterStatus] = (c[s as FilterStatus] || 0) + 1;
    });
    return c;
  }, [bookings]);

  const facilityOptions = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((b) => { if (b.facilities?.name) set.add(b.facilities.name); });
    return Array.from(set).sort();
  }, [bookings]);

  const advActive = !!(advBookingId || (advFacility && advFacility !== "__any__") || advFrom || advTo);
  const advCount = [advBookingId, advFacility !== "__any__" ? advFacility : "", advFrom, advTo].filter(Boolean).length;

  const clearAdvanced = () => {
    setAdvBookingId("");
    setAdvFacility("__any__");
    setAdvFrom("");
    setAdvTo("");
  };

  // Autocomplete suggestions: facility names, dates, and booking IDs matching current input
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const facilities = new Set<string>();
    const dates = new Set<string>();
    const ids: string[] = [];
    bookings.forEach((b) => {
      const name = b.facilities?.name;
      if (name && name.toLowerCase().includes(q)) facilities.add(name);
      const pretty = format(parseISO(b.booking_date), "PPP");
      if (pretty.toLowerCase().includes(q) || b.booking_date.includes(q)) dates.add(pretty);
      const shortId = b.id.slice(0, 8).toUpperCase();
      if (shortId.toLowerCase().includes(q.replace(/^#/, ""))) ids.push(`#${shortId}`);
    });
    return [
      ...Array.from(facilities).slice(0, 4).map((v) => ({ kind: "Facility", value: v })),
      ...Array.from(dates).slice(0, 4).map((v) => ({ kind: "Date", value: v })),
      ...ids.slice(0, 4).map((v) => ({ kind: "Booking ID", value: v })),
    ].slice(0, 8);
  }, [search, bookings]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-3">My Bookings</h1>
        <p className="text-muted-foreground text-lg mb-8">Manage your reservations across Butuan City venues.</p>

        {/* Filters + search */}
        {bookings.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder="Search by date, facility, or booking ID…"
                className="pl-9 pr-9"
                aria-label="Search bookings"
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
              {searchFocused && suggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button
                      key={`${s.kind}-${s.value}-${i}`}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setSearch(s.value.replace(/^#/, "")); }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/60 flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate">{s.value}</span>
                      <span className="text-[10px] uppercase tracking-widest text-accent font-bold flex-shrink-0">{s.kind}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f.value)}
                  className="font-bold tracking-wider"
                >
                  {f.label}
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${filter === f.value ? "bg-primary-foreground/20" : "bg-muted"}`}>
                    {counts[f.value] || 0}
                  </span>
                </Button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={advActive ? "default" : "outline"} size="sm" className="font-bold tracking-wider">
                    <SlidersHorizontal className="size-4" /> Advanced
                    {advActive && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary-foreground/20">{advCount}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-lg tracking-wider">Advanced filters</h4>
                      {advActive && (
                        <Button variant="ghost" size="sm" onClick={clearAdvanced} className="h-7 px-2 text-xs">Clear</Button>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Booking ID (exact)</Label>
                      <Input
                        value={advBookingId}
                        onChange={(e) => setAdvBookingId(e.target.value)}
                        placeholder="e.g. A1B2C3D4 or full UUID"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Facility (exact match)</Label>
                      <Select value={advFacility} onValueChange={setAdvFacility}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__any__">Any facility</SelectItem>
                          {facilityOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">From</Label>
                        <Input type="date" value={advFrom} onChange={(e) => setAdvFrom(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">To</Label>
                        <Input type="date" value={advTo} onChange={(e) => setAdvTo(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-card-gradient border border-border rounded-2xl">
            <p className="text-muted-foreground mb-4">No bookings yet.</p>
            <Button onClick={() => navigate("/facilities")}>Browse facilities</Button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16 bg-card-gradient border border-border rounded-2xl">
            <p className="text-muted-foreground mb-4">No bookings match your filters.</p>
            <Button variant="outline" onClick={() => { setFilter("all"); setSearch(""); }}>Clear filters</Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Recurring series */}
            {grouped.series.map(([sid, items]) => {
              const pendingItems = items.filter((i) => i.status === "pending");
              const totalPending = pendingItems.reduce((s, i) => s + Number(i.total_price), 0);
              const facility = items[0].facilities;
              return (
                <section key={sid} className="bg-hero border border-border rounded-2xl p-5 shadow-card">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary/20 grid place-items-center"><Users className="size-5 text-accent" /></div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-accent font-bold">Team series</span>
                        <h2 className="font-display text-2xl tracking-wider">{facility?.name}</h2>
                        <p className="text-xs text-muted-foreground">{items.length} session{items.length === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                    {pendingItems.length > 0 && (
                      <Button onClick={() => setPayTarget({ ids: pendingItems.map((i) => i.id), amount: totalPending })} size="sm">
                        <CreditCard className="size-4" /> Pay all · {formatPHP(totalPending)}
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3">
                    {items.map((b) => <BookingRow key={b.id} b={b} customerName={customerName} onCancel={cancelBooking} onPay={(id, amt) => setPayTarget({ ids: [id], amount: amt })} />)}
                  </div>
                </section>
              );
            })}

            {/* Single bookings */}
            {grouped.single.length > 0 && (
              <div className="grid gap-3">
                {grouped.single.map((b) => (
                  <BookingRow key={b.id} b={b} customerName={customerName} onCancel={cancelBooking} onPay={(id, amt) => setPayTarget({ ids: [id], amount: amt })} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {payTarget && (
        <PaymentDialog
          open={!!payTarget}
          onOpenChange={(v) => !v && setPayTarget(null)}
          bookingIds={payTarget.ids}
          amount={payTarget.amount}
          onPaid={refresh}
        />
      )}

      <Footer />
    </div>
  );
}

function BookingRow({
  b,
  customerName,
  onCancel,
  onPay,
}: {
  b: Booking;
  customerName: string;
  onCancel: (id: string) => void;
  onPay: (id: string, amount: number) => void;
}) {
  const isPast = parseISO(b.booking_date) < new Date(new Date().setHours(0, 0, 0, 0));
  const displayStatus: BookingStatus =
    b.status === "paid" && isPast ? "completed" : b.status;

  return (
    <div className="grid sm:grid-cols-[160px_1fr_auto] gap-5 bg-card-gradient border border-border rounded-2xl p-4 shadow-card">
      <img
        src={resolveFacilityImage(b.facilities?.image_url, b.facilities?.sport_type)}
        alt={b.facilities?.name || "Facility"}
        className="w-full h-32 sm:h-full object-cover rounded-xl"
        loading="lazy"
      />
      <div className="flex flex-col justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-accent font-bold">{b.facilities?.sport_type}</span>
          <h3 className="font-display text-2xl tracking-wider">{b.facilities?.name}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="size-3" />{b.facilities?.location}</span>
            <span className="flex items-center gap-1.5"><Calendar className="size-3" />{format(parseISO(b.booking_date), "PPP")}</span>
            <span className="flex items-center gap-1.5"><Clock className="size-3" />{b.start_hour}:00 – {b.end_hour}:00</span>
            <span className="font-mono opacity-60">#{b.id.slice(0, 8).toUpperCase()}</span>
          </div>
          {b.owner_notes && (
            <div className="mt-3 flex gap-2 items-start text-xs bg-accent/10 border border-accent/30 rounded-lg p-2.5">
              <StickyNote className="size-3.5 text-accent flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground whitespace-pre-wrap">{b.owner_notes}</span>
            </div>
          )}
        </div>
        <BookingTimeline status={displayStatus} />
      </div>
      <div className="flex sm:flex-col items-end justify-between gap-2">
        <div className="text-right">
          <div className="text-2xl font-bold text-accent">{formatPHP(b.total_price)}</div>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto items-end">
          {b.status === "pending" && !isPast && (
            <Button size="sm" onClick={() => onPay(b.id, Number(b.total_price))}>
              <CreditCard className="size-4" /> Pay now
            </Button>
          )}
          {(b.status === "paid" || b.status === "completed") && (
            <Button variant="outline" size="sm" onClick={() => downloadReceipt(b, customerName)}>
              <Receipt className="size-4" /> Receipt
            </Button>
          )}
          {b.status !== "cancelled" && !isPast && (
            <Button variant="outline" size="sm" onClick={() => onCancel(b.id)}>
              <X className="size-4" /> Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
