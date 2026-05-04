CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App settings readable by all authenticated"
  ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert settings"
  ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update settings"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (key, value)
VALUES ('commission_rate', '0.10'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_payout NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.compute_booking_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _rate NUMERIC(5,4);
BEGIN
  IF TG_OP = 'INSERT' OR NEW.total_price IS DISTINCT FROM OLD.total_price THEN
    SELECT (value)::text::numeric INTO _rate
    FROM public.app_settings WHERE key = 'commission_rate';
    IF _rate IS NULL THEN _rate := 0.10; END IF;
    NEW.commission_rate := _rate;
    NEW.commission_amount := ROUND(COALESCE(NEW.total_price,0) * _rate, 2);
    NEW.owner_payout := ROUND(COALESCE(NEW.total_price,0) - NEW.commission_amount, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_commission_trg ON public.bookings;
CREATE TRIGGER bookings_commission_trg
  BEFORE INSERT OR UPDATE OF total_price ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.compute_booking_commission();

UPDATE public.bookings
SET commission_rate = 0.10,
    commission_amount = ROUND(COALESCE(total_price,0) * 0.10, 2),
    owner_payout = ROUND(COALESCE(total_price,0) * 0.90, 2)
WHERE commission_amount = 0 AND total_price > 0;

CREATE INDEX IF NOT EXISTS idx_bookings_facility_paid_at
  ON public.bookings (facility_id, paid_at)
  WHERE status IN ('paid','completed');