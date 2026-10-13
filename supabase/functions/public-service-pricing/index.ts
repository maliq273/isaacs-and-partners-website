import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = ["https://www.isaacsandpartners.online", "https://maliq273.github.io"];
  const allowOrigin = allowedOrigins.includes(origin) ? origin : "https://www.isaacsandpartners.online";
  const headers = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=60, s-maxage=60",
    "Vary": "Origin"
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  if (origin && !allowedOrigins.includes(origin)) return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response(JSON.stringify({ error: "Pricing service is not configured" }), { status: 503, headers });
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.from("service_catalog")
    .select("code,name,service_domain,pricing_mode,minimum_fee,default_currency,metadata")
    .eq("active", true).gt("minimum_fee", 0)
    .order("service_domain").order("name");
  if (error) return new Response(JSON.stringify({ error: "Unable to load published prices" }), { status: 503, headers });
  const services = (data || []).filter((s: any) => {
    const m = s.metadata || {};
    return m.public_pricing === true || m.price_set_by != null || ["ADMIN_SET", "APPROVED_ANCHOR"].includes(m.pricing_status);
  }).map((s: any) => ({
    code: s.code, name: s.name, service_domain: s.service_domain || "Other",
    pricing_mode: s.pricing_mode, amount: Number(s.minimum_fee),
    currency: s.default_currency || "ZAR",
    billing_rule: s.metadata?.billing_rule || "Quote confirms billing basis",
    price_label: s.metadata?.public_price_label || null,
    public_note: s.metadata?.public_note || null
  }));
  return new Response(JSON.stringify({ version: 1, currency: "ZAR", updated_at: new Date().toISOString(), services }), { status: 200, headers });
});