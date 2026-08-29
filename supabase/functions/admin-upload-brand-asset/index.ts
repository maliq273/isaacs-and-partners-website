import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.isaacsandpartners.online",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const clean = (value: unknown) => String(value ?? "").trim();
const roleOf = (value: unknown) => clean(value).toUpperCase();

const extensionFor = (mime: string) => ({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
}[mime] ?? null);

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
};

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey;
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  const repository = Deno.env.get("GITHUB_REPOSITORY") ?? "maliq273/isaacs-and-partners-website";

  const token = clean(request.headers.get("Authorization")).replace(/^Bearer\s+/i, "");
  if (!supabaseUrl || !serviceRoleKey || !anonKey || !githubToken || !token) {
    return json({ error: "Asset service is not fully configured." }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

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

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const role = roleOf(payload?.role);
  const userId = clean(payload?.user_id);
  const dataUrl = clean(payload?.data_url);

  if (!["INDIVIDUAL", "BUSINESS"].includes(role)) {
    return json({ error: "Asset role must be INDIVIDUAL or BUSINESS." }, 400);
  }
  if (!userId) return json({ error: "user_id is required." }, 400);

  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return json({ error: "Only JPEG, PNG or WebP images are supported." }, 400);

  const mime = match[1].toLowerCase();
  const extension = extensionFor(mime);
  const base64 = match[2];
  const estimatedBytes = Math.floor((base64.length * 3) / 4);
  if (!extension) return json({ error: "Unsupported image type." }, 400);
  if (estimatedBytes > 5 * 1024 * 1024) return json({ error: "The image must be 5 MB or smaller." }, 400);

  const path = role === "INDIVIDUAL"
    ? `assets/client-avatars/${userId}.${extension}`
    : `assets/business-logos/${userId}.${extension}`;

  const apiBase = `https://api.github.com/repos/${repository}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };

  let existingSha: string | undefined;
  const existingResponse = await fetch(apiBase, { headers });
  if (existingResponse.ok) {
    const existing = await existingResponse.json();
    existingSha = existing.sha;
  } else if (existingResponse.status !== 404) {
    const error = await existingResponse.text();
    return json({ error: `GitHub asset lookup failed: ${error}` }, 502);
  }

  const githubResponse = await fetch(apiBase, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `chore: update ${role.toLowerCase()} brand asset ${userId}`,
      content: base64,
      ...(existingSha ? { sha: existingSha } : {})
    })
  });

  const githubBody = await githubResponse.json().catch(() => ({}));
  if (!githubResponse.ok) {
    return json({ error: `GitHub asset upload failed: ${githubBody?.message ?? "Unknown GitHub error."}` }, 502);
  }

  const assetUrl = `https://maliq273.github.io/isaacs-and-partners-website/${path}`;
  const table = role === "INDIVIDUAL" ? "profiles" : "businesses";
  const column = role === "INDIVIDUAL" ? "avatar_url" : "logo_url";
  const query = role === "INDIVIDUAL"
    ? admin.from(table).update({ [column]: assetUrl }).eq("id", userId)
    : admin.from(table).update({ [column]: assetUrl }).eq("owner_user_id", userId);
  const { error: updateError } = await query;
  if (updateError) return json({ error: `Account branding could not be saved: ${updateError.message}` }, 400);

  await admin.from("audit_logs").insert({
    actor_user_id: caller.user.id,
    action: `${role}_BRAND_ASSET_UPLOADED`,
    entity_type: role === "INDIVIDUAL" ? "profile" : "business",
    entity_id: userId,
    new_data: { asset_url: assetUrl, github_path: path, mime_type: mime, bytes: estimatedBytes },
    metadata: { source: "admin-upload-brand-asset", repository }
  });

  return json({ success: true, asset_url: assetUrl, github_path: path });
});
