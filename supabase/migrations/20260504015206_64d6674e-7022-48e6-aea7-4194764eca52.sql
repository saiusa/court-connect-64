
-- Partner application table
CREATE TYPE public.partner_app_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  business_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  facility_type text NOT NULL,
  location text NOT NULL,
  description text,
  status public.partner_app_status NOT NULL DEFAULT 'pending',
  reviewer_id uuid,
  review_notes text,
  reviewed_at timestamptz,
  checklist jsonb NOT NULL DEFAULT '{"profile_complete":false,"first_facility_added":false,"payout_info_added":false,"reviewed_terms":false}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own application" ON public.partner_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all applications" ON public.partner_applications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own application" ON public.partner_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own application checklist" ON public.partner_applications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins update applications" ON public.partner_applications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_partner_applications_updated_at
  BEFORE UPDATE ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Approve/reject RPC: provisions owner role automatically
CREATE OR REPLACE FUNCTION public.admin_review_partner_application(
  _application_id uuid,
  _approve boolean,
  _notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
  _target uuid;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller,'admin') THEN
    RAISE EXCEPTION 'Only admins can review applications' USING ERRCODE='42501';
  END IF;

  SELECT user_id INTO _target FROM public.partner_applications WHERE id = _application_id;
  IF _target IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  UPDATE public.partner_applications
  SET status = CASE WHEN _approve THEN 'approved'::partner_app_status ELSE 'rejected'::partner_app_status END,
      reviewer_id = _caller,
      review_notes = _notes,
      reviewed_at = now()
  WHERE id = _application_id;

  IF _approve THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.admin_audit_log (admin_user_id, target_user_id, action, role, metadata)
    VALUES (_caller, _target, 'partner_approved', 'owner', jsonb_build_object('application_id', _application_id));
  ELSE
    INSERT INTO public.admin_audit_log (admin_user_id, target_user_id, action, metadata)
    VALUES (_caller, _target, 'partner_rejected', jsonb_build_object('application_id', _application_id, 'notes', _notes));
  END IF;
END;
$$;
