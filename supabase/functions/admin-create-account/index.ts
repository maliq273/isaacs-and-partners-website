import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.isaacsandpartners.online",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const roleOf = (value: unknown) => String(value ?? "").trim().toUpperCase();
const errorMessage = (error: unknown) => {
  if (error && typeof error === "object") {
    const item = error as Record<string, unknown>;
    return String(item.message ?? item.error_description ?? item.error ?? "Unknown error.");
  }
  return String(error ?? "Unknown error.");
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey;
  const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();

  if (!supabaseUrl || !serviceRoleKey || !token) {
    return json({ error: "Server configuration or authentication is missing." }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const callerClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: caller, error: callerError } = await callerClient.auth.getUser(token);

  if (callerError || !caller.user) return json({ error: "Authenticated user could not be verified." }, 401);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,role,is_active")
    .eq("id", caller.user.id)
    .maybeSingle();

  if (profileError) return json({ error: `Profile verification failed: ${profileError.message}` }, 500);
  if (!profile || roleOf(profile.role) !== "SUPER_ADMIN" || profile.is_active === false) {
    return json({ error: "SUPER_ADMIN access is required." }, 403);
  }

  const payload = await request.json().catch(() => null);
  const role = roleOf(payload?.role);
  const email = String(payload?.email ?? "").trim().toLowerCase();
  const password = String(payload?.password ?? "");
  const firstName = String(payload?.first_name ?? payload?.firstName ?? "").trim();
  const lastName = String(payload?.last_name ?? payload?.lastName ?? "").trim();
  const phone = String(payload?.phone ?? "").trim();

  if (!['INDIVIDUAL', 'BUSINESS'].includes(role)) return json({ error: "Only INDIVIDUAL or BUSINESS accounts may be created by this function." }, 400);
  if (!email || !email.includes("@")) return json({ error: "A valid email address is required." }, 400);
  if (password.length < 8) return json({ error: "The temporary password must contain at least 8 characters." }, 400);
  if (!firstName && role === "INDIVIDUAL") return json({ error: "First name is required for an individual account." }, 400);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      account_type: role.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      phone
    }
  });

  if (createError || !created.user) return json({ error: `Authentication account could not be created: ${createError?.message ?? "unknown error"}` }, 400);

  const userId = created.user.id;
  let profileCreated = false;
  let businessId: string | null = null;
  let stage = "profile";

  try {
    const { error: upsertError } = await admin.from("profiles").upsert({
      id: userId,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null,
      role,
      is_active: true
    }, { onConflict: "id" });

    if (upsertError) throw new Error(`Profile creation failed: ${upsertError.message}`);
    profileCreated = true;

    if (role === "BUSINESS") {
      stage = "business";
      const suppliedLegalName = payload?.legal_name ?? payload?.legalName;
      const fallbackLegalName = `${firstName} ${lastName}`.trim();
      const legalName = String(suppliedLegalName ?? fallbackLegalName || email).trim();
      const tradingName = String(payload?.trading_name ?? payload?.tradingName ?? "").trim();
      const registrationNumber = String(payload?.registration_number ?? payload?.registrationNumber ?? "").trim();
      const taxNumber = String(payload?.tax_number ?? payload?.taxNumber ?? "").trim();

      const { data: business, error: businessError } = await admin.from("businesses").insert({
        owner_user_id: userId,
        legal_name: legalName,
        trading_name: tradingName || null,
        registration_number: registrationNumber || null,
        tax_number: taxNumber || null,
        email,
        phone: phone || null,
        is_active: true
      }).select("id,owner_user_id,legal_name,trading_name,registration_number,tax_number,email,phone,is_active,created_at,updated_at").single();

      if (businessError || !business) throw new Error(`Business record creation failed: ${businessError?.message ?? "No business record was returned."}`);
      businessId = business.id;
    }

    stage = "audit";
    const { error: auditError } = await admin.from("audit_logs").insert({
      actor_user_id: caller.user.id,
      action: `${role}_ACCOUNT_CREATED`,
      entity_type: role === "BUSINESS" ? "business" : "profile",
      entity_id: businessId ?? userId,
      previous_data: null,
      new_data: { user_id: userId, email, first_name: firstName || null, last_name: lastName || null, role, business_id: businessId },
      metadata: { source: "admin-create-account" }
    });

    return json({ created: true, role, user_id: userId, business_id: businessId, warning: auditError ? `Account created, but audit logging failed: ${auditError.message}` : null });
  } catch (error) {
    console.error(`[admin-create-account] stage=${stage}`, error);
    if (businessId) await admin.from("businesses").delete().eq("id", businessId);
    if (profileCreated) await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return json({ error: `${errorMessage(error)} (stage: ${stage})` }, 400);
  }
});
