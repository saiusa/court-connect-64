import { Check, Clock, CreditCard, X, Trophy } from "lucide-react";

export type BookingStatus = "pending" | "paid" | "cancelled" | "completed";

const STEPS: { key: BookingStatus; label: string; icon: any }[] = [
  { key: "pending", label: "Reserved", icon: Clock },
  { key: "paid", label: "Paid", icon: CreditCard },
  { key: "completed", label: "Played", icon: Trophy },
];

export function BookingTimeline({ status }: { status: BookingStatus }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30">
        <X className="size-4 text-destructive" />
        <span className="text-xs font-bold uppercase tracking-wider text-destructive">Cancelled</span>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center gap-1.5 w-full">
      {STEPS.map((step, i) => {
        const reached = i <= currentIdx;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`size-7 rounded-full grid place-items-center transition-all ${
                  reached
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {reached && i < currentIdx ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
              </div>
              <span className={`text-[10px] uppercase tracking-wider font-bold ${reached ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 -mt-4 rounded ${i < currentIdx ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
