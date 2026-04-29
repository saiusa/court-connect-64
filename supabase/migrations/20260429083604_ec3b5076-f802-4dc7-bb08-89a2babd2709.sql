ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_channel TEXT NOT NULL DEFAULT 'in_app' CHECK (reminder_channel IN ('in_app','email')),
  ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS owner_notes TEXT;

CREATE POLICY "Owners can update notes on their facility bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.facilities f WHERE f.id = bookings.facility_id AND f.owner_id = auth.uid()));