import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FacilityCard } from "@/components/FacilityCard";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero.jpg";
import { Calendar, Users, Zap, Shield, ArrowRight, MapPin } from "lucide-react";

interface Facility {
  id: string; name: string; sport_type: string; location: string;
  hourly_price: number; image_url: string | null; open_hour: number; close_hour: number;
}

export default function Index() {
  const [facilities, setFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    document.title = "Courtside · Book Local Sports Facilities";
    supabase.from("facilities").select("*").limit(6).then(({ data }) => {
      setFacilities((data as Facility[]) || []);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="" className="w-full h-full object-cover opacity-30" width={1600} height={1000} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>
        <div className="container py-24 md:py-36 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-6 animate-fade-up">
            <span className="size-2 rounded-full bg-accent animate-glow-pulse" />
            <span className="text-xs uppercase tracking-widest text-accent font-bold">Local sports · Booked instantly</span>
          </div>
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl tracking-wider leading-[0.95] mb-6 animate-fade-up">
            BOOK YOUR<br /><span className="text-gradient">COURT.</span> PLAY.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 animate-fade-up">
            From basketball courts to badminton halls, soccer pitches to gyms — reserve your spot in seconds, no calls, no hassle.
          </p>
          <div className="flex flex-wrap gap-3 animate-fade-up">
            <Button asChild size="lg" className="h-14 px-8 text-base font-bold tracking-wider shadow-glow">
              <Link to="/facilities">Browse facilities <ArrowRight className="size-5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base font-bold tracking-wider">
              <Link to="/auth">Sign up free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* BENTO STATS */}
      <section className="container py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: MapPin, label: "Local Venues", value: "120+" },
            { icon: Calendar, label: "Bookings This Month", value: "8.4K" },
            { icon: Users, label: "Active Players", value: "12K" },
            { icon: Zap, label: "Avg. Booking Time", value: "<30s" },
          ].map((s, i) => (
            <div key={i} className="bg-card-gradient border border-border rounded-2xl p-6 shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all">
              <s.icon className="size-6 text-accent mb-3" />
              <div className="font-display text-4xl tracking-wider text-gradient">{s.value}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED BENTO GRID */}
      <section className="container py-16">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-accent font-bold">Featured</span>
            <h2 className="font-display text-5xl md:text-6xl tracking-wider mt-2">Top Facilities</h2>
          </div>
          <Button asChild variant="ghost" size="lg">
            <Link to="/facilities">View all <ArrowRight className="size-4" /></Link>
          </Button>
        </div>

        {facilities.length >= 6 && (
          <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4 md:h-[700px]">
            <FacilityCard {...facilities[0]} className="md:col-span-2 md:row-span-2" />
            <FacilityCard {...facilities[1]} />
            <FacilityCard {...facilities[2]} />
          </div>
        )}
        {facilities.length >= 6 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <FacilityCard {...facilities[3]} />
            <FacilityCard {...facilities[4]} />
            <FacilityCard {...facilities[5]} />
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-16">
        <span className="text-xs uppercase tracking-widest text-accent font-bold">How it works</span>
        <h2 className="font-display text-5xl md:text-6xl tracking-wider mt-2 mb-10">Three steps to play.</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Find your spot", d: "Browse local facilities by sport, location and price." },
            { n: "02", t: "Pick your slot", d: "Real-time availability calendar — no double bookings." },
            { n: "03", t: "Show up & play", d: "Confirmation in seconds. Manage everything from your dashboard." },
          ].map((s) => (
            <div key={s.n} className="bg-card-gradient border border-border rounded-2xl p-8 shadow-card relative overflow-hidden">
              <div className="font-display text-7xl tracking-wider text-primary/20 absolute -top-2 right-4">{s.n}</div>
              <h3 className="font-display text-3xl tracking-wider mb-2 relative">{s.t}</h3>
              <p className="text-muted-foreground relative">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OWNER CTA */}
      <section className="container py-20">
        <div className="bg-hero border border-border rounded-3xl p-10 md:p-16 shadow-elevated relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative max-w-2xl">
            <Shield className="size-10 text-accent mb-4" />
            <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-4">Own a facility? Fill it.</h2>
            <p className="text-muted-foreground text-lg mb-6">
              List your courts and pitches on Courtside. Get more bookings, less admin. Subscriptions and per-booking commission plans available.
            </p>
            <Button asChild size="lg" className="h-13 font-bold tracking-wider">
              <Link to="/auth">Become a partner <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
