// Admin-triggered password reset email.
// - Requires a valid JWT.
// - Verifies caller is an admin via has_role().
// - Looks up the target user's email with the service role.
// - Sends a recovery email via Supabase Auth.
// - Logs the action via admin_log_password_reset RPC.
import { createClient, corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Server-side admin check
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleErr) return json({ error: roleErr.message }, 500);
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    // Validate input
    let body: { target_user_id?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const targetId = body.target_user_id;
    if (!targetId || typeof targetId !== "string") {
      return json({ error: "target_user_id is required" }, 400);
    }

    // Lookup user email
    const { data: targetUser, error: getErr } = await admin.auth.admin.getUserById(targetId);
    if (getErr || !targetUser?.user?.email) {
      return json({ error: "Target user not found or has no email" }, 404);
    }
    const targetEmail = targetUser.user.email;

    // Send password reset email (Supabase will send via configured templates)
    const origin = req.headers.get("origin") ?? new URL(SUPABASE_URL).origin;
    const { error: resetErr } = await admin.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${origin}/auth`,
    });
    if (resetErr) return json({ error: resetErr.message }, 500);

    // Audit log via the security-definer RPC (uses caller JWT for auth.uid())
    const { error: logErr } = await userClient.rpc("admin_log_password_reset", {
      _target_user_id: targetId,
    });
    if (logErr) console.error("Audit log error:", logErr.message);

    return json({ ok: true, email: targetEmail });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
