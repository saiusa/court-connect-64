// Admin-triggered password reset email.
// - Requires a valid JWT.
// - Verifies caller is an admin via has_role().
// - Server-side cooldown: same target cannot be reset more than once per 5 min,
//   and any single admin cannot trigger more than 10 resets per hour.
// - Looks up target email with the service role and sends a recovery email.
// - Logs the action via admin_log_password_reset RPC.
import { createClient, corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const TARGET_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes per target
const ADMIN_HOURLY_LIMIT = 10;             // resets per admin per hour

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

    // --- Rate limiting (DB-backed via audit log) ---
    const nowMs = Date.now();
    const cooldownIso = new Date(nowMs - TARGET_COOLDOWN_MS).toISOString();
    const hourIso = new Date(nowMs - 60 * 60 * 1000).toISOString();

    const [{ data: recentTarget }, { data: recentAdmin }] = await Promise.all([
      admin
        .from("admin_audit_log")
        .select("created_at")
        .eq("action", "password_reset")
        .eq("target_user_id", targetId)
        .gte("created_at", cooldownIso)
        .limit(1),
      admin
        .from("admin_audit_log")
        .select("id", { count: "exact", head: true })
        .eq("action", "password_reset")
        .eq("admin_user_id", callerId)
        .gte("created_at", hourIso),
    ]);

    if (recentTarget && recentTarget.length > 0) {
      const last = new Date(recentTarget[0].created_at).getTime();
      const retryAfterSec = Math.ceil((TARGET_COOLDOWN_MS - (nowMs - last)) / 1000);
      return new Response(
        JSON.stringify({
          error: `Cooldown active. Try again in ${retryAfterSec}s.`,
          retry_after: retryAfterSec,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfterSec) },
        },
      );
    }

    // recentAdmin is a head count query — count is on the response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminCount = (recentAdmin as any)?.length ?? 0;
    // The supabase-js head/count returns { count } via the response object,
    // but here we re-query defensively for portability:
    const { count: adminHourCount } = await admin
      .from("admin_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "password_reset")
      .eq("admin_user_id", callerId)
      .gte("created_at", hourIso);

    if ((adminHourCount ?? adminCount) >= ADMIN_HOURLY_LIMIT) {
      return new Response(
        JSON.stringify({
          error: `Hourly reset limit reached (${ADMIN_HOURLY_LIMIT}/hour). Please wait before retrying.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Lookup user email
    const { data: targetUser, error: getErr } = await admin.auth.admin.getUserById(targetId);
    if (getErr || !targetUser?.user?.email) {
      return json({ error: "Target user not found or has no email" }, 404);
    }
    const targetEmail = targetUser.user.email;

    const origin = req.headers.get("origin") ?? new URL(SUPABASE_URL).origin;
    const { error: resetErr } = await admin.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${origin}/auth`,
    });
    if (resetErr) return json({ error: resetErr.message }, 500);

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
