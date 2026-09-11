import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.isaacsandpartners.online",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};
const clean = (v: unknown, max = 4096) => String(v ?? "").trim().slice(0, max);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const normalisePhone = (v: unknown) => { const raw = clean(v, 64); if (!raw || /@lid/i.test(raw)) return null; const digits = raw.replace(/\D/g, ""); return digits || null; };
const roles = new Set(["SUPER_ADMIN", "DIRECTOR", "SHAREHOLDER", "PARTNER", "STAFF", "STAKEHOLDER"]);
const permissionFields = ["can_liaise_with_ai","can_answer_ai_queries","can_relay_to_client","can_handle_appointments","can_provide_pricing","can_approve_quotes","can_handle_immigration","can_handle_hr","can_handle_business_compliance","can_handle_legal"];

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!["GET", "POST"].includes(request.method)) return json({ error: "Method not allowed." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const bearer = clean(request.headers.get("Authorization")).replace(/^Bearer\s+/i, "");
    if (!url || !serviceKey || !anonKey || !bearer) return json({ error: "Authentication is required." }, 401);
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const caller = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const verified = await caller.auth.getUser(bearer);
    if (verified.error || !verified.data.user) return json({ error: "Authenticated user could not be verified." }, 401);
    const actorId = verified.data.user.id;
    const profile = await admin.from("profiles").select("id,role,is_active").eq("id", actorId).maybeSingle();
    if (profile.error) return json({ error: profile.error.message }, 500);
    if (!profile.data || String(profile.data.role).toUpperCase() !== "SUPER_ADMIN" || profile.data.is_active === false) return json({ error: "SUPER_ADMIN access is required." }, 403);

    if (request.method === "GET") {
      const rows = await admin.from("authority_directory").select("*").order("is_active", { ascending: false }).order("full_name", { ascending: true });
      if (rows.error) return json({ error: rows.error.message }, 500);
      const staffIds = (rows.data || []).filter(r => r.user_id).map(r => r.user_id);
      let permissions: any[] = [];
      if (staffIds.length) {
        const p = await admin.from("staff_ai_permissions").select("staff_user_id,can_liaise_with_ai,can_answer_ai_queries,can_relay_to_clients,can_handle_appointments,can_provide_pricing,can_approve_quotes,can_handle_immigration,can_handle_hr,can_handle_business_compliance,can_handle_legal,is_active").in("staff_user_id", staffIds);
        if (p.error) return json({ error: p.error.message }, 500);
        permissions = p.data || [];
      }
      const permissionMap = new Map(permissions.map(p => [p.staff_user_id, p]));
      return json({ rows: (rows.data || []).map(row => ({ ...row, ai_permissions: permissionMap.get(row.user_id) || null })) });
    }

    const payload = await request.json().catch(() => ({})) as Record<string, any>;
    const action = clean(payload.action, 64).toLowerCase();
    if (action === "save") {
      const id = clean(payload.id, 64) || null;
      const fullName = clean(payload.full_name, 255);
      const phone = normalisePhone(payload.phone_number);
      const authorityRole = clean(payload.authority_role, 64).toUpperCase();
      if (!fullName || !phone || !roles.has(authorityRole)) return json({ error: "Name, WhatsApp number and a valid authority role are required." }, 400);
      const data = {
        full_name: fullName,
        phone_number: phone,
        authority_role: authorityRole,
        job_title: clean(payload.job_title, 255) || null,
        department: clean(payload.department, 255) || null,
        notes: clean(payload.notes, 4000) || null,
        is_active: payload.is_active !== false,
        user_id: clean(payload.user_id, 64) || null,
        updated_by: actorId
      };
      const existing = id ? await admin.from("authority_directory").select("*").eq("id", id).maybeSingle() : { data: null, error: null };
      if (existing.error) return json({ error: existing.error.message }, 500);
      const duplicate = await admin.from("authority_directory").select("id").eq("phone_number", phone).eq("is_active", true).neq("id", id || "00000000-0000-0000-0000-000000000000").limit(1);
      if (duplicate.error) return json({ error: duplicate.error.message }, 500);
      if (duplicate.data?.length && data.is_active) return json({ error: "That WhatsApp number is already assigned to another active authority record." }, 409);
      let saved;
      if (id) saved = await admin.from("authority_directory").update(data).eq("id", id).select("*").single();
      else saved = await admin.from("authority_directory").insert({ ...data, created_by: actorId }).select("*").single();
      if (saved.error) return json({ error: saved.error.message }, 500);
      await admin.from("authority_directory_audit").insert({ authority_id: saved.data.id, actor_user_id: actorId, action: id ? "UPDATED" : "CREATED", old_data: existing.data || null, new_data: saved.data });

      if (authorityRole === "STAFF" && data.user_id) {
        const incoming = payload.ai_permissions || {};
        const permissionBody: Record<string, any> = { staff_user_id: data.user_id, is_active: data.is_active, updated_by: actorId };
        for (const field of permissionFields) if (Object.prototype.hasOwnProperty.call(incoming, field)) permissionBody[field] = incoming[field] === true;
        const permissionExisting = await admin.from("staff_ai_permissions").select("id").eq("staff_user_id", data.user_id).maybeSingle();
        if (permissionExisting.error) return json({ error: permissionExisting.error.message }, 500);
        const permissionResult = permissionExisting.data?.id
          ? await admin.from("staff_ai_permissions").update(permissionBody).eq("id", permissionExisting.data.id)
          : await admin.from("staff_ai_permissions").insert(permissionBody);
        if (permissionResult.error) return json({ error: permissionResult.error.message }, 500);
      }
      return json({ success: true, row: saved.data });
    }
    if (action === "deactivate") {
      const id = clean(payload.id, 64);
      if (!id) return json({ error: "Authority record id is required." }, 400);
      const current = await admin.from("authority_directory").select("*").eq("id", id).maybeSingle();
      if (current.error || !current.data) return json({ error: current.error?.message || "Authority record not found." }, 404);
      const saved = await admin.from("authority_directory").update({ is_active: false, updated_by: actorId }).eq("id", id).select("*").single();
      if (saved.error) return json({ error: saved.error.message }, 500);
      await admin.from("authority_directory_audit").insert({ authority_id: id, actor_user_id: actorId, action: "DEACTIVATED", old_data: current.data, new_data: saved.data });
      return json({ success: true, row: saved.data });
    }
    return json({ error: "Unknown authority directory action." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected authority directory error." }, 500);
  }
});