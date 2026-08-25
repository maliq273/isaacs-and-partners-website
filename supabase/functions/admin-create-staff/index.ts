import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.isaacsandpartners.online",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const normaliseRole = (value: unknown) => String(value ?? "STAFF").trim().toUpperCase();

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!supabaseUrl || !serviceRoleKey || !token) {
    return json({ error: "Server configuration or authentication is missing." }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
  if (callerError || !callerData.user) return json({ error: "Authenticated user could not be verified." }, 401);

  const callerId = callerData.user.id;
  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("id,role,is_active")
    .eq("id", callerId)
    .maybeSingle();

  if (profileError) return json({ error: profileError.message }, 500);
  if (!callerProfile || normaliseRole(callerProfile.role) !== "SUPER_ADMIN" || callerProfile.is_active === false) {
    return json({ error: "SUPER_ADMIN access is required." }, 403);
  }

  const payload = await request.json().catch(() => null);
  const email = String(payload?.email ?? "").trim().toLowerCase();
  const password = String(payload?.password ?? "");
  const firstName = String(payload?.first_name ?? payload?.firstName ?? "").trim();
  const lastName = String(payload?.last_name ?? payload?.lastName ?? "").trim();
  const department = String(payload?.department ?? "").trim();
  const role = normaliseRole(payload?.role || "STAFF");

  if (!email || !email.includes("@")) return json({ error: "A valid staff email is required." }, 400);
  if (password.length < 8) return json({ error: "The temporary password must contain at least 8 characters." }, 400);
  if (role === "SUPER_ADMIN") return json({ error: "SUPER_ADMIN accounts cannot be created from Staff Administration." }, 400);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { account_type: "staff", first_name: firstName, last_name: lastName, department }
  });

  if (createError || !created.user) {
    return json({ error: createError?.message ?? "Staff authentication account could not be created." }, 400);
  }

  const userId = created.user.id;
  let profileInserted = false;

  try {
    const { error: updateProfileError } = await admin
      .from("profiles")
      .upsert({
        id: userId,
        email,
        role,
        is_active: true,
        staff_id: null
      }, { onConflict: "id" });

    if (updateProfileError) throw updateProfileError;
    profileInserted = true;

    const staffRecord: Record<string, unknown> = { user_id: userId, status: "active" };
    if (firstName) staffRecord.first_name = firstName;
    if (lastName) staffRecord.last_name = lastName;
    if (department) staffRecord.department = department;

    const { data: staff, error: staffError } = await admin
      .from("staff")
      .insert(staffRecord)
      .select("*")
      .single();

    if (staffError) throw staffError;

    const { error: linkError } = await admin
      .from("profiles")
      .update({ staff_id: staff.id })
      .eq("id", userId);

    if (linkError) throw linkError;

    await admin.from("audit_logs").insert({
      actor_id: callerId,
      action: "STAFF_CREATED",
      entity_type: "staff",
      entity_id: staff.id,
      details: { email, role, department }
    });

    return json({ created: true, user_id: userId, staff });
  } catch (error) {
    await admin.auth.admin.deleteUser(userId);
    if (profileInserted) await admin.from("profiles").delete().eq("id", userId);
    return json({ error: error instanceof Error ? error.message : "Staff record could not be created." }, 400);
  }
});
