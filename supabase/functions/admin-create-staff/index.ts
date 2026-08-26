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

const errorMessage = (error: unknown) => {
  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    return String(candidate.message ?? candidate.error_description ?? candidate.error ?? "Unknown database error.");
  }
  return String(error ?? "Unknown error.");
};

const makeEmployeeNumber = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `IP-${stamp}-${random}`;
};

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

  if (profileError) return json({ error: `Profile verification failed: ${profileError.message}` }, 500);
  if (!callerProfile || normaliseRole(callerProfile.role) !== "SUPER_ADMIN" || callerProfile.is_active === false) {
    return json({ error: "SUPER_ADMIN access is required." }, 403);
  }

  const payload = await request.json().catch(() => null);
  const email = String(payload?.email ?? "").trim().toLowerCase();
  const password = String(payload?.password ?? "");
  const firstName = String(payload?.first_name ?? payload?.firstName ?? "").trim();
  const lastName = String(payload?.last_name ?? payload?.lastName ?? "").trim();
  const phone = String(payload?.phone ?? "").trim();
  const department = String(payload?.department ?? "").trim();
  const jobTitle = String(payload?.job_title ?? payload?.jobTitle ?? "").trim();
  const employeeNumber = String(payload?.employee_number ?? payload?.employeeNumber ?? "").trim() || makeEmployeeNumber();
  const role = normaliseRole(payload?.role || "STAFF");

  if (!email || !email.includes("@")) return json({ error: "A valid staff email is required." }, 400);
  if (password.length < 8) return json({ error: "The temporary password must contain at least 8 characters." }, 400);
  if (role === "SUPER_ADMIN") return json({ error: "SUPER_ADMIN accounts cannot be created from Staff Administration." }, 400);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      account_type: "staff",
      first_name: firstName,
      last_name: lastName,
      phone,
      department,
      job_title: jobTitle
    }
  });

  if (createError || !created.user) {
    return json({ error: `Authentication account could not be created: ${createError?.message ?? "unknown error"}` }, 400);
  }

  const userId = created.user.id;
  let profileInserted = false;
  let staffId: string | null = null;
  let stage = "profile";

  try {
    const { error: updateProfileError } = await admin
      .from("profiles")
      .upsert({
        id: userId,
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        role,
        is_active: true
      }, { onConflict: "id" });

    if (updateProfileError) throw new Error(`Profile creation failed: ${updateProfileError.message}`);
    profileInserted = true;

    stage = "staff";
    const staffRecord = {
      user_id: userId,
      employee_number: employeeNumber,
      department: department || null,
      job_title: jobTitle || null,
      is_active: true
    };

    const { data: staff, error: staffError } = await admin
      .from("staff")
      .insert(staffRecord)
      .select("id,user_id,employee_number,department,job_title,is_active,created_at,updated_at")
      .single();

    if (staffError || !staff) {
      throw new Error(`Staff record creation failed: ${staffError?.message ?? "No staff record was returned."}`);
    }
    staffId = staff.id;

    stage = "audit";
    const { error: auditError } = await admin.from("audit_logs").insert({
      actor_user_id: callerId,
      action: "STAFF_CREATED",
      entity_type: "staff",
      entity_id: staff.id,
      previous_data: null,
      new_data: {
        user_id: userId,
        email,
        role,
        department,
        job_title: jobTitle,
        employee_number: employeeNumber,
        is_active: true
      },
      metadata: {
        source: "admin-create-staff",
        provisioning_stage: "staff_created"
      }
    });

    const auditWarning = auditError ? ` Staff account created, but audit logging failed: ${auditError.message}` : "";

    return json({ created: true, user_id: userId, staff, warning: auditWarning || null });
  } catch (error) {
    console.error(`[admin-create-staff] stage=${stage}`, error);
    await admin.auth.admin.deleteUser(userId);
    if (profileInserted) await admin.from("profiles").delete().eq("id", userId);
    return json({ error: `${errorMessage(error)} (stage: ${stage})`, stage, staff_id: staffId }, 400);
  }
});
