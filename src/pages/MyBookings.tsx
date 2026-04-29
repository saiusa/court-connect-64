import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveFacilityImage } from "@/lib/facility-images";
import { formatPHP } from "@/lib/format";
import { BookingTimeline, type BookingStatus } from "@/components/BookingTimeline";
import { PaymentDialog } from "@/components/PaymentDialog";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, X, CreditCard, Users, Receipt, Search, StickyNote } from "lucide-react";
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
  const [customerName, setCustomerName] = useState<string>("");

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

  // Apply filter + search, then group by series
  const filteredBookings = useMemo(() => {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      // Display status (paid + past = completed)
      const isPast = parseISO(b.booking_date) < today;
      const displayStatus: BookingStatus = b.status === "paid" && isPast ? "completed" : b.status;
      if (filter !== "all" && displayStatus !== filter) return false;
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
  }, [bookings, filter, search]);

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
                placeholder="Search by date, facility, or booking ID…"
                className="pl-9"
              />
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
