-- Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('grant','revoke','password_reset')),
  role public.app_role,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log (target_user_id);

-- Secure grant role function (admin-only, audited)
CREATE OR REPLACE FUNCTION public.admin_grant_role(_target_user_id uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(_caller, 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant roles' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.admin_audit_log (admin_user_id, target_user_id, action, role)
  VALUES (_caller, _target_user_id, 'grant', _role);
END;
$$;

-- Secure revoke role function (admin-only, audited, blocks zero-admin state)
CREATE OR REPLACE FUNCTION public.admin_revoke_role(_target_user_id uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _admin_count int;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(_caller, 'admin') THEN
    RAISE EXCEPTION 'Only admins can revoke roles' USING ERRCODE = '42501';
  END IF;

  -- Safeguard: never leave the system with zero admins
  IF _role = 'admin' THEN
    SELECT COUNT(*) INTO _admin_count FROM public.user_roles WHERE role = 'admin';
    IF _admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot revoke the last remaining admin' USING ERRCODE = '23514';
    END IF;
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id AND role = _role;

  INSERT INTO public.admin_audit_log (admin_user_id, target_user_id, action, role)
  VALUES (_caller, _target_user_id, 'revoke', _role);
END;
$$;

-- Helper to record password reset events triggered by admins
CREATE OR REPLACE FUNCTION public.admin_log_password_reset(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller, 'admin') THEN
    RAISE EXCEPTION 'Only admins can trigger password resets' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.admin_audit_log (admin_user_id, target_user_id, action)
  VALUES (_caller, _target_user_id, 'password_reset');
END;
$$;

-- Unique constraint required for grant ON CONFLICT (matches existing UNIQUE on user_id+role from app_role table); add if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_roles'::regclass AND contype = 'u'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;
