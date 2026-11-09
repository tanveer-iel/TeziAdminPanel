// Edge Function: panel-password-reset
// "Forgot password" for the admin PANEL only. Sends the reset email only if the address belongs to a panel
// user (an active row in admin_users, or a built-in Super Admin). Anyone else (for example a mobile-app
// customer) gets { ok: false, reason: "not_panel" } and no email is sent.
// Body: { email: string, redirectTo: string }   Deploy: supabase functions deploy panel-password-reset
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const BOOTSTRAP_SUPERS = ["tanveer@iel.net.pk"]; // keep in step with is_super_admin() and admin-users

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email, redirectTo } = await req.json();
    const address = String(email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return json({ ok: false, reason: "bad_email" });

    // The link must come back to the panel's reset page (Supabase also checks its redirect allow-list).
    let target: string | undefined;
    try {
      const u = new URL(String(redirectTo));
      if (u.pathname.replace(/\/+$/, "") === "/reset-password") target = u.toString();
    } catch (_) { /* no usable redirect */ }
    if (!target) return json({ ok: false, reason: "bad_redirect" });

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let isPanel = BOOTSTRAP_SUPERS.includes(address);
    if (!isPanel) {
      // ilike is case-insensitive; escape the wildcard characters that can appear in an email.
      const pattern = address.replace(/[\\%_]/g, (c) => "\\" + c);
      const { data, error } = await admin
        .from("admin_users").select("user_id").ilike("email", pattern).eq("active", true).limit(1);
      if (error) throw error;
      isPanel = (data?.length ?? 0) > 0;
    }
    if (!isPanel) return json({ ok: false, reason: "not_panel" });

    const { error } = await admin.auth.resetPasswordForEmail(address, { redirectTo: target });
    if (error) {
      const throttled = /rate limit|too many|seconds/i.test(error.message);
      return json({ ok: false, reason: throttled ? "rate_limited" : "send_failed" });
    }
    return json({ ok: true });
  } catch (e) {
    console.error("panel-password-reset error:", e);
    return json({ ok: false, reason: "error" }, 500);
  }
});
