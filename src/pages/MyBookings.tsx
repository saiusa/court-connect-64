import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { resolveFacilityImage } from "@/lib/facility-images";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, X } from "lucide-react";

interface Booking {
  id: string;
  booking_date: string;
  start_hour: number;
  end_hour: number;
  total_price: number;
  status: string;
  facilities: {
    id: string;
    name: string;
    sport_type: string;
    location: string;
    image_url: string | null;
  } | null;
}

export default function MyBookings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "My Bookings · Courtside";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    supabase
      .from("bookings")
      .select("id,booking_date,start_hour,end_hour,total_price,status,facilities(id,name,sport_type,location,image_url)")
      .eq("user_id", user.id)
      .order("booking_date", { ascending: false })
      .then(({ data }) => {
        setBookings((data as any as Booking[]) || []);
        setLoading(false);
      });
  }, [user, authLoading, navigate]);

  const cancelBooking = async (id: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setBookings((b) => b.filter((x) => x.id !== id));
    toast.success("Booking cancelled");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-3">My Bookings</h1>
        <p className="text-muted-foreground text-lg mb-10">Manage your upcoming and past reservations.</p>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-card-gradient border border-border rounded-2xl">
            <p className="text-muted-foreground mb-4">No bookings yet.</p>
            <Button onClick={() => navigate("/facilities")}>Browse facilities</Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {bookings.map((b) => {
              const isPast = parseISO(b.booking_date) < new Date(new Date().setHours(0, 0, 0, 0));
              return (
                <div key={b.id} className="grid sm:grid-cols-[180px_1fr_auto] gap-5 bg-card-gradient border border-border rounded-2xl p-4 shadow-card">
                  <img
                    src={resolveFacilityImage(b.facilities?.image_url, b.facilities?.sport_type)}
                    alt={b.facilities?.name || "Facility"}
                    className="w-full h-32 sm:h-full object-cover rounded-xl"
                    loading="lazy"
                  />
                  <div className="flex flex-col justify-center">
                    <span className="text-xs uppercase tracking-wider text-accent font-bold mb-1">{b.facilities?.sport_type}</span>
                    <h3 className="font-display text-2xl tracking-wider">{b.facilities?.name}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{b.facilities?.location}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="size-3.5" />{format(parseISO(b.booking_date), "PPP")}</span>
                      <span className="flex items-center gap-1.5"><Clock className="size-3.5" />{b.start_hour}:00 – {b.end_hour}:00</span>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-end justify-between gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-accent">${Number(b.total_price).toFixed(2)}</div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{isPast ? "Completed" : b.status}</div>
                    </div>
                    {!isPast && (
                      <Button variant="outline" size="sm" onClick={() => cancelBooking(b.id)}>
                        <X className="size-4" />Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
