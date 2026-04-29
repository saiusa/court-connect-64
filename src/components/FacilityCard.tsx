import { Link } from "react-router-dom";
import { MapPin, Clock } from "lucide-react";
import { resolveFacilityImage } from "@/lib/facility-images";

interface Props {
  id: string;
  name: string;
  sport_type: string;
  location: string;
  hourly_price: number;
  image_url?: string | null;
  open_hour: number;
  close_hour: number;
  className?: string;
}

export function FacilityCard(p: Props) {
  const img = resolveFacilityImage(p.image_url, p.sport_type);
  return (
    <Link
      to={`/facilities/${p.id}`}
      className={`group relative overflow-hidden rounded-2xl bg-card-gradient border border-border shadow-card hover:shadow-elevated transition-all duration-500 hover:-translate-y-1 ${p.className ?? ""}`}
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={img}
          alt={p.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>
      <div className="absolute top-4 left-4">
        <span className="px-3 py-1 rounded-full bg-primary/90 backdrop-blur text-primary-foreground text-xs font-bold uppercase tracking-wider">
          {p.sport_type}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="font-display text-2xl tracking-wide mb-2">{p.name}</h3>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-3.5" />
            <span className="truncate max-w-[160px]">{p.location}</span>
          </div>
          <div className="flex items-center gap-1 font-bold text-accent">
            <span className="text-lg">${p.hourly_price}</span>
            <span className="text-xs text-muted-foreground">/hr</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
          <Clock className="size-3" />
          <span>{p.open_hour}:00 – {p.close_hour}:00</span>
        </div>
      </div>
    </Link>
  );
}
