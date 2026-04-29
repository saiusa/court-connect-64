import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FacilityCard } from "@/components/FacilityCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Facility {
  id: string;
  name: string;
  sport_type: string;
  location: string;
  hourly_price: number;
  image_url: string | null;
  open_hour: number;
  close_hour: number;
}

const SPORTS = ["All", "Basketball", "Badminton", "Gym", "Soccer", "Tennis"];

export default function Facilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Facilities · Courtside";
    supabase.from("facilities").select("*").order("name").then(({ data }) => {
      setFacilities((data as Facility[]) || []);
      setLoading(false);
    });
  }, []);

  const visible = facilities.filter((f) => {
    if (filter !== "All" && f.sport_type !== filter) return false;
    if (search && !`${f.name} ${f.location}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <div className="mb-10">
          <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-3">All Facilities</h1>
          <p className="text-muted-foreground text-lg">Find and book your perfect spot.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SPORTS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  filter === s
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading facilities…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No facilities match your filters.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((f) => (
              <FacilityCard key={f.id} {...f} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
