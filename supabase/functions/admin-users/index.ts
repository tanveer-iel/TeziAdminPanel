// Edge Function: admin-users
// Lets a Super Admin create / update / delete panel logins. Needs the service-role key,
// which is why this cannot run in the browser. Deploy:  supabase functions deploy admin-users
// Body: { action: "create"|"update"|"delete", ... }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const BOOTSTRAP_SUPERS = ["tanveer@iel.net.pk"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";

    // Caller-scoped client: is_super_admin() reads the caller's JWT.
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: me } = await caller.auth.getUser();
    if (!me?.user) return json({ error: "Not signed in" }, 401);
    const { data: isSuper } = await caller.rpc("is_super_admin");
    if (!isSuper) return json({ error: "Super Admin only" }, 403);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const b = await req.json();

    if (b.action === "create") {
      const email = String(b.email ?? "").trim().toLowerCase();
      if (!email) return json({ error: "Email is required" }, 400);
      if (!b.role) return json({ error: "Role is required" }, 400);

      // Does this person already have a login (e.g. a mobile-app customer)? Then just grant the
      // role. Their password and app profile are left untouched.
      let existingId: string | null = null;
      for (let page = 1; page <= 50 && !existingId; page++) {
        const { data: list, error: lErr } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (lErr) return json({ error: lErr.message }, 400);
        existingId = list.users.find((u) => (u.email ?? "").toLowerCase() === email)?.id ?? null;
        if (list.users.length < 1000) break;
      }

      if (existingId) {
        const { error: upErr } = await admin.from("admin_users").upsert({
          user_id: existingId, email, full_name: b.full_name || null, role: b.role, active: true,
        });
        if (upErr) return json({ error: upErr.message }, 400);
        return json({ ok: true, user_id: existingId, existing: true });
      }

      if (!b.password || String(b.password).length < 8) {
        return json({ error: "A password of 8+ characters is required for a new login" }, 400);
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: b.password,
        email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);
      const { error: insErr } = await admin.from("admin_users").insert({
        user_id: data.user.id,
        email,
        full_name: b.full_name || null,
        role: b.role,
        active: true,
      });
      if (insErr) {
        await admin.auth.admin.deleteUser(data.user.id); // roll back the login
        return json({ error: insErr.message }, 400);
      }
      return json({ ok: true, user_id: data.user.id });
    }

    if (b.action === "update") {
      const { data: row } = await admin
        .from("admin_users")
        .select("email")
        .eq("user_id", b.user_id)
        .single();
      if (!row) return json({ error: "User not found" }, 404);
      const protectedUser =
        BOOTSTRAP_SUPERS.includes(row.email.toLowerCase()) || b.user_id === me.user.id;
      if (protectedUser && (b.active === false || (b.role && b.role !== "super"))) {
        return json({ error: "You cannot demote or deactivate this account" }, 400);
      }
      const patch: Record<string, unknown> = {};
      for (const k of ["full_name", "role", "active"]) if (b[k] !== undefined) patch[k] = b[k];
      if (Object.keys(patch).length) {
        const { error } = await admin.from("admin_users").update(patch).eq("user_id", b.user_id);
        if (error) return json({ error: error.message }, 400);
      }
      // Contact details live on the app profile too; keep them in step if a profile exists.
      const profPatch: Record<string, unknown> = {};
      if (b.full_name !== undefined) profPatch.full_name = b.full_name || null;
      if (b.phone !== undefined) {
        const digits = String(b.phone).replace(/\D/g, "");
        profPatch.phone_number = digits ? Number(digits) : null;
      }
      if (Object.keys(profPatch).length) {
        const { error } = await admin.from("profiles").update(profPatch).eq("id", b.user_id);
        if (error) return json({ error: error.message }, 400);
      }
      const authPatch: Record<string, unknown> = {};
      if (b.password) {
        if (String(b.password).length < 8) return json({ error: "Password must be 8+ characters" }, 400);
        authPatch.password = b.password;
      }
      if (b.active !== undefined) authPatch.ban_duration = b.active ? "none" : "876000h";
      if (Object.keys(authPatch).length) {
        const { error } = await admin.auth.admin.updateUserById(b.user_id, authPatch);
        if (error) return json({ error: error.message }, 400);
      }
      return json({ ok: true });
    }

    if (b.action === "delete") {
      const { data: row } = await admin
        .from("admin_users")
        .select("email")
        .eq("user_id", b.user_id)
        .single();
      if (row && (BOOTSTRAP_SUPERS.includes(row.email.toLowerCase()) || b.user_id === me.user.id)) {
        return json({ error: "You cannot delete this account" }, 400);
      }
      const { error } = await admin.auth.admin.deleteUser(b.user_id); // cascades to admin_users
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
