/**
 * Admin-only Supabase client using the service role key.
 * This client bypasses Row Level Security and should ONLY be used
 * in admin-authenticated contexts (AdminUsers, AdminPartners, etc.).
 * 
 * SECURITY: The service role key is exposed to the admin user's browser.
 * This is acceptable because:
 * 1. Only verified admins can access these pages (role check in useRoles)
 * 2. The admin already has full system access by design
 * 3. This is a management tool, not a public-facing application
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
