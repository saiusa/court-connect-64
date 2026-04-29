import { useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarRange, Users } from "lucide-react";
import { toast } from "sonner";
import { formatPHP } from "@/lib/format";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  facility: { id: string; name: string; hourly_price: number; open_hour: number; close_hour: number };
  userId: string;
  onCreated: () => void;
}

export function RecurringBookingDialog({ open, onOpenChange, facility, userId, onCreated }: Props) {
  const [teamName, setTeamName] = useState("");
  const [weekday, setWeekday] = useState("2"); // Tue
  const [startHour, setStartHour] = useState(String(facility.open_hour + 1));
  const [duration, setDuration] = useState("1");
  const [weeks, setWeeks] = useState("4");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStartHour(String(Math.min(facility.open_hour + 1, facility.close_hour - 1)));
    }
  }, [open, facility]);

  const hours = useMemo(
    () => Array.from({ length: facility.close_hour - facility.open_hour - Number(duration) + 1 }, (_, i) => facility.open_hour + i),
    [facility, duration]
  );

  const dates = useMemo(() => {
    const today = startOfDay(new Date());
    const wd = Number(weekday);
    // First occurrence on/after today matching weekday
    let first = today;
    while (first.getDay() !== wd) first = addDays(first, 1);
    return Array.from({ length: Number(weeks) }, (_, i) => addWeeks(first, i));
  }, [weekday, weeks]);

  const startH = Number(startHour);
  const endH = startH + Number(duration);
  const perSession = (endH - startH) * Number(facility.hourly_price);
  const totalEstimate = perSession * dates.length;

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      toast.error("Give your team a name.");
      return;
    }
    setSubmitting(true);

    // 1. Create the series
    const { data: series, error: sErr } = await supabase
      .from("booking_series")
      .insert({
        user_id: userId,
        facility_id: facility.id,
        team_name: teamName.trim(),
        weekday: Number(weekday),
        start_hour: startH,
        end_hour: endH,
        weeks: Number(weeks),
        start_date: format(dates[0], "yyyy-MM-dd"),
      })
      .select()
      .single();

    if (sErr || !series) {
      setSubmitting(false);
      toast.error(sErr?.message || "Could not create series");
      return;
    }

    // 2. Check existing bookings for those dates to avoid overlaps
    const dateStrs = dates.map((d) => format(d, "yyyy-MM-dd"));
    const { data: existing } = await supabase
      .from("bookings")
      .select("booking_date,start_hour,end_hour")
      .eq("facility_id", facility.id)
      .in("booking_date", dateStrs)
      .neq("status", "cancelled");

    const conflictDates = new Set<string>();
    (existing || []).forEach((b: any) => {
      // overlap if not (b.end <= startH || b.start >= endH)
      if (!(b.end_hour <= startH || b.start_hour >= endH)) {
        conflictDates.add(b.booking_date);
      }
    });

    const toBook = dateStrs.filter((d) => !conflictDates.has(d));
    if (toBook.length === 0) {
      setSubmitting(false);
      toast.error("All requested slots are already taken.");
      return;
    }

    const rows = toBook.map((d) => ({
      user_id: userId,
      facility_id: facility.id,
      booking_date: d,
      start_hour: startH,
      end_hour: endH,
      total_price: perSession,
      status: "pending" as const,
      series_id: series.id,
    }));

    const { error: bErr } = await supabase.from("bookings").insert(rows);
    setSubmitting(false);

    if (bErr) {
      toast.error(bErr.message);
      return;
    }

    const skipped = dates.length - toBook.length;
    toast.success(
      `Created series "${teamName}" · ${toBook.length} session${toBook.length === 1 ? "" : "s"} reserved${
        skipped ? ` (${skipped} skipped due to conflicts)` : ""
      }. Pay from My Bookings to confirm.`
    );
    onCreated();
    onOpenChange(false);
    setTeamName("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wider flex items-center gap-2">
            <Users className="size-6 text-accent" /> Recurring team session
          </DialogTitle>
          <DialogDescription>
            Reserve the same slot every week for your team. Conflicting dates are skipped automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="team">Team name</Label>
            <Input id="team" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Butuan Ballers" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Day of week</Label>
              <Select value={weekday} onValueChange={setWeekday}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Number of weeks</Label>
              <Select value={weeks} onValueChange={setWeeks}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[2, 4, 6, 8, 12].map((w) => <SelectItem key={w} value={String(w)}>{w} weeks</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start time</Label>
              <Select value={startHour} onValueChange={setStartHour}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{hours.map((h) => <SelectItem key={h} value={String(h)}>{h}:00</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3].map((d) => <SelectItem key={d} value={String(d)}>{d}h</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Sessions</span><span className="font-bold">{dates.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">First date</span><span>{format(dates[0], "PPP")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Per session</span><span>{formatPHP(perSession)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 mt-2 text-base"><span>Estimated total</span><span className="font-bold text-accent">{formatPHP(totalEstimate)}</span></div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} size="lg" className="w-full font-bold tracking-wider">
            <CalendarRange className="size-5" />
            {submitting ? "Creating series…" : "Reserve series"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
