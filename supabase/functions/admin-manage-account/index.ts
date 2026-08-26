import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.isaacsandpartners.online",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const roleOf = (value: unknown) => String(value ?? "").trim().toUpperCase();
const clean = (value: unknown) => String(value ?? "").trim();

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey;
  const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!url || !serviceRoleKey || !anonKey || !token) return json({ error: "Server configuration or authentication is missing." }, 500);

  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const callerClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: caller, error: callerError } = await callerClient.auth.getUser(token);
  if (callerError || !caller.user) return json({ error: "Authenticated user could not be verified." }, 401);

  const { data: callerProfile, error: callerProfileError } = await admin
    .from("profiles")
    .select("id,role,is_active")
    .eq("id", caller.user.id)
    .maybeSingle();
  if (callerProfileError) return json({ error: `Profile verification failed: ${callerProfileError.message}` }, 500);
  if (!callerProfile || roleOf(callerProfile.role) !== "SUPER_ADMIN" || callerProfile.is_active === false) {
    return json({ error: "SUPER_ADMIN access is required." }, 403);
  }

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = clean(payload?.action).toLowerCase();
  const role = roleOf(payload?.role);
  const userId = clean(payload?.user_id);

  if (!["INDIVIDUAL", "BUSINESS"].includes(role)) return json({ error: "Only INDIVIDUAL and BUSINESS accounts can be managed here." }, 400);

  if (action === "create") {
    const email = clean(payload?.email).toLowerCase();
    const password = clean(payload?.password);
    const firstName = clean(payload?.first_name ?? payload?.firstName);
    const lastName = clean(payload?.last_name ?? payload?.lastName);
    const phone = clean(payload?.phone);
    if (!email.includes("@")) return json({ error: "A valid email address is required." }, 400);
    if (password.length < 8) return json({ error: "The temporary password must contain at least 8 characters." }, 400);
    if (role === "INDIVIDUAL" && !firstName) return json({ error: "First name is required." }, 400);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { account_type: role.toLowerCase(), first_name: firstName, last_name: lastName, phone }
    });
    if (createError || !created.user) return json({ error: createError?.message ?? "Authentication account could not be created." }, 400);

    const createdId = created.user.id;
    try {
      const { error: profileError } = await admin.from("profiles").upsert({
        id: createdId, email, first_name: firstName || null, last_name: lastName || null,
        phone: phone || null, role, is_active: true
      }, { onConflict: "id" });
      if (profileError) throw new Error(profileError.message);

      let business = null;
      if (role === "BUSINESS") {
        const legalName = clean(payload?.legal_name ?? payload?.legalName) || `${firstName} ${lastName}`.trim() || email;
        const { data, error } = await admin.from("businesses").insert({
          owner_user_id: createdId,
          legal_name: legalName,
          trading_name: clean(payload?.trading_name ?? payload?.tradingName) || null,
          registration_number: clean(payload?.registration_number ?? payload?.registrationNumber) || null,
          tax_number: clean(payload?.tax_number ?? payload?.taxNumber) || null,
          email, phone: phone || null, is_active: true
        }).select("*").single();
        if (error || !data) throw new Error(error?.message ?? "Business record could not be created.");
        business = data;
      }

      await admin.from("audit_logs").insert({
        actor_user_id: caller.user.id,
        action: `${role}_ACCOUNT_CREATED`,
        entity_type: role === "BUSINESS" ? "business" : "profile",
        entity_id: role === "BUSINESS" ? business?.id : createdId,
        new_data: { user_id: createdId, email, role, business_id: business?.id ?? null },
        metadata: { source: "admin-manage-account" }
      });
      return json({ success: true, user_id: createdId, business_id: business?.id ?? null });
    } catch (error) {
      await admin.from("businesses").delete().eq("owner_user_id", createdId);
      await admin.from("profiles").delete().eq("id", createdId);
      await admin.auth.admin.deleteUser(createdId);
      return json({ error: `Account creation rolled back: ${error instanceof Error ? error.message : String(error)}` }, 400);
    }
  }

  if (!userId) return json({ error: "user_id is required." }, 400);
  if (userId === caller.user.id) return json({ error: "A Super Admin cannot modify their own administrative account through this endpoint." }, 403);

  const { data: target, error: targetError } = await admin.from("profiles").select("id,email,first_name,last_name,phone,role,is_active").eq("id", userId).maybeSingle();
  if (targetError) return json({ error: targetError.message }, 500);
  if (!target || roleOf(target.role) !== role) return json({ error: "Target account was not found or role does not match." }, 404);

  if (action === "update") {
    const firstName = payload?.first_name === undefined ? target.first_name : clean(payload.first_name);
    const lastName = payload?.last_name === undefined ? target.last_name : clean(payload.last_name);
    const phone = payload?.phone === undefined ? target.phone : clean(payload.phone);
    const email = payload?.email === undefined ? target.email : clean(payload.email).toLowerCase();
    if (!String(email).includes("@")) return json({ error: "A valid email address is required." }, 400);

    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      email,
      user_metadata: { first_name: firstName || "", last_name: lastName || "", phone: phone || "", account_type: role.toLowerCase() }
    });
    if (authError) return json({ error: `Authentication account could not be updated: ${authError.message}` }, 400);

    const { error: profileUpdateError } = await admin.from("profiles").update({
      email, first_name: firstName || null, last_name: lastName || null, phone: phone || null
    }).eq("id", userId);
    if (profileUpdateError) return json({ error: `Profile could not be updated: ${profileUpdateError.message}` }, 400);

    if (role === "BUSINESS") {
      const businessPatch = {
        legal_name: clean(payload?.legal_name) || undefined,
        trading_name: payload?.trading_name === undefined ? undefined : clean(payload.trading_name) || null,
        registration_number: payload?.registration_number === undefined ? undefined : clean(payload.registration_number) || null,
        tax_number: payload?.tax_number === undefined ? undefined : clean(payload.tax_number) || null,
        email, phone: phone || null
      };
      Object.keys(businessPatch).forEach(key => { if (businessPatch[key as keyof typeof businessPatch] === undefined) delete businessPatch[key as keyof typeof businessPatch]; });
      const { error } = await admin.from("businesses").update(businessPatch).eq("owner_user_id", userId);
      if (error) return json({ error: `Business record could not be updated: ${error.message}` }, 400);
    }

    await admin.from("audit_logs").insert({ actor_user_id: caller.user.id, action: `${role}_ACCOUNT_UPDATED`, entity_type: role === "BUSINESS" ? "business" : "profile", entity_id: role === "BUSINESS" ? null : userId, previous_data: target, new_data: { email, first_name: firstName, last_name: lastName, phone }, metadata: { source: "admin-manage-account" } });
    return json({ success: true, user_id: userId });
  }

  if (action === "set_status") {
    const active = Boolean(payload?.is_active);
    const { error: profileUpdateError } = await admin.from("profiles").update({ is_active: active }).eq("id", userId);
    if (profileUpdateError) return json({ error: `Profile status could not be updated: ${profileUpdateError.message}` }, 400);
    if (role === "BUSINESS") {
      const { error } = await admin.from("businesses").update({ is_active: active }).eq("owner_user_id", userId);
      if (error) return json({ error: `Business status could not be updated: ${error.message}` }, 400);
    }
    await admin.from("audit_logs").insert({ actor_user_id: caller.user.id, action: `${role}_ACCOUNT_${active ? "ACTIVATED" : "DEACTIVATED"}`, entity_type: role === "BUSINESS" ? "business" : "profile", entity_id: role === "BUSINESS" ? null : userId, previous_data: { is_active: target.is_active }, new_data: { is_active: active }, metadata: { source: "admin-manage-account" } });
    return json({ success: true, user_id: userId, is_active: active });
  }

  if (action === "reset_password") {
    const password = clean(payload?.password);
    if (password.length < 8) return json({ error: "Password must contain at least 8 characters." }, 400);
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) return json({ error: `Password could not be reset: ${error.message}` }, 400);
    await admin.from("audit_logs").insert({ actor_user_id: caller.user.id, action: `${role}_PASSWORD_RESET`, entity_type: "profile", entity_id: userId, metadata: { source: "admin-manage-account" } });
    return json({ success: true, user_id: userId });
  }

  return json({ error: `Unsupported account action: ${action}` }, 400);
});
