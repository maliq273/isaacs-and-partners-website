import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.isaacsandpartners.online",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json"
};
const clean = (value: unknown) => String(value ?? "").trim();
const roleOf = (value: unknown) => clean(value).toUpperCase();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!["GET", "POST"].includes(request.method)) return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? serviceRoleKey;
    const bearer = clean(request.headers.get("Authorization")).replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !serviceRoleKey || !anonKey || !bearer) return json({ error: "Authentication is required." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const callerClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: caller, error: callerError } = await callerClient.auth.getUser(bearer);
    if (callerError || !caller.user) return json({ error: "Authenticated user could not be verified." }, 401);

    const { data: profile, error: profileError } = await admin.from("profiles").select("id,role,is_active").eq("id", caller.user.id).maybeSingle();
    if (profileError) return json({ error: `Profile verification failed: ${profileError.message}` }, 500);
    if (!profile || roleOf(profile.role) !== "SUPER_ADMIN" || profile.is_active === false) return json({ error: "SUPER_ADMIN access is required." }, 403);

    if (request.method === "GET") {
      const { data, error } = await admin.from("github_integration_config").select("repository,configured_at,last_tested_at,last_test_status,last_test_message").eq("id", "default").maybeSingle();
      if (error) return json({ error: error.message }, 500);
      return json({ configured: Boolean(data?.configured_at), repository: data?.repository ?? "maliq273/isaacs-and-partners-website", configured_at: data?.configured_at ?? null, last_tested_at: data?.last_tested_at ?? null, last_test_status: data?.last_test_status ?? null, last_test_message: data?.last_test_message ?? null });
    }

    const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = clean(payload.action).toLowerCase();
    if (action === "save") {
      const githubToken = clean(payload.token);
      const repository = clean(payload.repository || "maliq273/isaacs-and-partners-website");
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) return json({ error: "Repository must use owner/name format." }, 400);
      if (!githubToken) return json({ error: "Enter a GitHub token before saving." }, 400);
      const { data, error } = await admin.rpc("set_github_integration_config", { p_actor: caller.user.id, p_token: githubToken, p_repository: repository });
      if (error) return json({ error: error.message }, 400);
      await admin.from("audit_logs").insert({ actor_user_id: caller.user.id, action: "GITHUB_INTEGRATION_CONFIGURED", entity_type: "github_integration", entity_id: "default", new_data: { repository, token_updated: true }, metadata: { source: "admin-github-config" } });
      return json({ success: true, ...(data ?? {}) });
    }

    if (action === "test") {
      const { data: secret, error: secretError } = await admin.rpc("get_github_integration_secret");
      if (secretError) return json({ error: secretError.message }, 500);
      const config = Array.isArray(secret) ? secret[0] : secret;
      if (!config?.github_token || !config?.repository) { await admin.rpc("record_github_integration_test", { p_status: "FAIL", p_message: "GitHub integration is not configured." }); return json({ error: "GitHub integration is not configured." }, 400); }
      const response = await fetch(`https://api.github.com/repos/${config.repository}`, { headers: { Authorization: `Bearer ${config.github_token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { const message = body?.message || `GitHub returned HTTP ${response.status}.`; await admin.rpc("record_github_integration_test", { p_status: "FAIL", p_message: message }); return json({ error: message }, 502); }
      const permissions = body?.permissions ?? {};
      const canPush = permissions.push === true || permissions.admin === true || permissions.maintain === true;
      const message = canPush ? "GitHub connection verified with repository write access." : "GitHub connection works, but repository write access was not confirmed.";
      await admin.rpc("record_github_integration_test", { p_status: canPush ? "PASS" : "FAIL", p_message: message });
      await admin.from("audit_logs").insert({ actor_user_id: caller.user.id, action: "GITHUB_INTEGRATION_TESTED", entity_type: "github_integration", entity_id: "default", new_data: { repository: config.repository, success: canPush, permissions: { push: Boolean(permissions.push), maintain: Boolean(permissions.maintain), admin: Boolean(permissions.admin) } }, metadata: { source: "admin-github-config" } });
      return json({ success: canPush, message, repository: config.repository });
    }
    return json({ error: "Unknown GitHub integration action." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected GitHub integration error." }, 500);
  }
});
