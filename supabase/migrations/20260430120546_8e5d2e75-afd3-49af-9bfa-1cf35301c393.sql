-- Allow admins to read all profiles (for the Admin UI user list)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all user_roles rows (so they can see existing roles for every user)
-- "Users can view their own roles" already exists; this adds admin visibility.
CREATE POLICY "Admins can view all user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));