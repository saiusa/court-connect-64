import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatPHP } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingIds: string[];
  amount: number;
  onPaid: () => void;
}

// Mock card checkout — accepts any 16-digit card. Marks bookings as paid.
// Replace with Paddle/Stripe checkout when payments are enabled.
export function PaymentDialog({ open, onOpenChange, bookingIds, amount, onPaid }: Props) {
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [processing, setProcessing] = useState(false);

  const validCard = card.replace(/\s/g, "").length === 16 && /^\d+$/.test(card.replace(/\s/g, ""));
  const validExp = /^\d{2}\/\d{2}$/.test(exp);
  const validCvc = /^\d{3,4}$/.test(cvc);
  const canPay = validCard && validExp && validCvc && name.trim().length > 1;

  const handlePay = async () => {
    if (!canPay) return;
    setProcessing(true);
    // Simulate processor latency
    await new Promise((r) => setTimeout(r, 1200));

    const ref = `MOCK-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase
      .from("bookings")
      .update({ status: "paid", paid_at: new Date().toISOString(), payment_ref: ref })
      .in("id", bookingIds);

    setProcessing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Payment successful · ${ref}`);
    setCard(""); setExp(""); setCvc(""); setName("");
    onPaid();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !processing && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wider flex items-center gap-2">
            <CreditCard className="size-6 text-accent" /> Secure Checkout
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-xs">
            <Lock className="size-3" /> Payments are simulated for testing — use any 16-digit number.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="bg-muted/40 border border-border rounded-xl p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total due</div>
              <div className="font-display text-3xl tracking-wider text-accent">{formatPHP(amount)}</div>
            </div>
            <ShieldCheck className="size-8 text-accent/60" />
          </div>

          <div>
            <Label htmlFor="cc-name">Cardholder name</Label>
            <Input id="cc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan dela Cruz" />
          </div>

          <div>
            <Label htmlFor="cc-num">Card number</Label>
            <Input
              id="cc-num"
              value={card}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                setCard(v.replace(/(.{4})/g, "$1 ").trim());
              }}
              placeholder="4242 4242 4242 4242"
              inputMode="numeric"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cc-exp">Expiry</Label>
              <Input
                id="cc-exp"
                value={exp}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                  setExp(v);
                }}
                placeholder="MM/YY"
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor="cc-cvc">CVC</Label>
              <Input
                id="cc-cvc"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="123"
                inputMode="numeric"
              />
            </div>
          </div>

          <Button onClick={handlePay} disabled={!canPay || processing} size="lg" className="w-full font-bold tracking-wider">
            {processing ? "Processing payment…" : `Pay ${formatPHP(amount)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
