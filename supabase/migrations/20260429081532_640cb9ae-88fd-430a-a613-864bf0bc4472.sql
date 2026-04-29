DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending','paid','cancelled','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_ref text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS series_id uuid;

ALTER TABLE public.bookings ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.bookings
  ALTER COLUMN status TYPE public.booking_status
  USING (CASE
    WHEN status IN ('pending','paid','cancelled','completed') THEN status::public.booking_status
    WHEN status = 'confirmed' THEN 'paid'::public.booking_status
    ELSE 'pending'::public.booking_status
  END);
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'pending'::public.booking_status;

CREATE TABLE IF NOT EXISTS public.booking_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  team_name text NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_hour int NOT NULL,
  end_hour int NOT NULL,
  weeks int NOT NULL CHECK (weeks BETWEEN 1 AND 52),
  start_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Series visible to owner" ON public.booking_series FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create their own series" ON public.booking_series FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own series" ON public.booking_series FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can grant roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can revoke roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.facilities (name, sport_type, location, description, hourly_price, open_hour, close_hour, image_url)
SELECT * FROM (VALUES
  ('Butuan City Sports Complex - Basketball Court', 'basketball', 'J.C. Aquino Ave, Butuan City', 'Full-size FIBA-grade basketball court in the heart of the city.', 350::numeric, 7, 22, 'basketball'),
  ('Father Saturnino Urios University Gymnasium', 'basketball', 'San Francisco St, Butuan City', 'Covered university gym available for community bookings.', 500::numeric, 8, 21, 'basketball'),
  ('Agusan Pavilion Badminton Hall', 'badminton', 'Montilla Blvd, Butuan City', '6 BWF-standard badminton courts with wooden flooring.', 250::numeric, 6, 23, 'badminton'),
  ('Caraga Sports Hub - Indoor Soccer', 'soccer', 'Libertad, Butuan City', '5-a-side indoor turf perfect for futsal and team practice.', 800::numeric, 9, 22, 'soccer'),
  ('Power Up Fitness Butuan', 'gym', 'Villa Kananga, Butuan City', 'Fully equipped gym with cardio, free weights and trainers.', 150::numeric, 5, 22, 'gym'),
  ('Guingona Park Tennis Courts', 'tennis', 'Guingona Park, Butuan City', 'Two outdoor hard courts open to the public.', 200::numeric, 6, 20, 'tennis')
) AS v(name, sport_type, location, description, hourly_price, open_hour, close_hour, image_url)
WHERE NOT EXISTS (SELECT 1 FROM public.facilities);