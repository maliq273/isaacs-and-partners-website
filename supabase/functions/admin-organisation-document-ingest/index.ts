import { createClient } from "supabase";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { Buffer } from "node:buffer";

const corsHeaders = { "Access-Control-Allow-Origin": "https://www.isaacsandpartners.online", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const clean = (v: unknown) => String(v ?? "").trim();

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? serviceRoleKey;
    const bearer = clean(request.headers.get("Authorization")).replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !serviceRoleKey || !anonKey || !bearer) return json({ error: "Document ingestion authentication is not configured." }, 500);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const callerClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: caller, error: callerError } = await callerClient.auth.getUser(bearer);
    if (callerError || !caller.user) return json({ error: "Authenticated user could not be verified." }, 401);
    const { data: profile, error: profileError } = await admin.from("profiles").select("role,is_active").eq("id", caller.user.id).maybeSingle();
    if (profileError) return json({ error: profileError.message }, 500);
    if (!profile || String(profile.role).toUpperCase() !== "SUPER_ADMIN" || profile.is_active === false) return json({ error: "SUPER_ADMIN access is required." }, 403);
    const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
    const documentId = clean(payload?.document_id);
    if (!documentId) return json({ error: "document_id is required." }, 400);
    const { data: document, error: documentError } = await admin.from("organisation_documents").select("id,storage_path,file_name,mime_type").eq("id", documentId).maybeSingle();
    if (documentError) return json({ error: documentError.message }, 500);
    if (!document?.storage_path) return json({ error: "Organisation document storage path is missing." }, 400);
    const { data: file, error: downloadError } = await admin.storage.from("organisation-documents").download(document.storage_path);
    if (downloadError || !file) return json({ error: downloadError?.message || "Document could not be downloaded." }, 500);
    const bytes = new Uint8Array(await file.arrayBuffer());
    let text = "";
    const name = String(document.file_name || "").toLowerCase();
    if (name.endsWith(".docx") || document.mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      text = String(result.value || "").trim();
    } else if (name.endsWith(".pdf") || document.mime_type === "application/pdf") {
      const pdf = await getDocumentProxy(bytes);
      const result = await extractText(pdf, { mergePages: true });
      text = String(result.text || "").trim();
    } else {
      text = new TextDecoder().decode(bytes).trim();
    }
    if (!text) throw new Error("No readable text was extracted from the document.");
    if (text.length > 1000000) text = text.slice(0, 1000000);
    const { error: updateError } = await admin.from("organisation_documents").update({ extracted_text: text, extraction_status: "EXTRACTED", extraction_error: null, updated_at: new Date().toISOString() }).eq("id", documentId);
    if (updateError) return json({ error: updateError.message }, 500);
    await admin.rpc("organisation_route_document", { p_document_id: documentId });
    return json({ success: true, document_id: documentId, characters: text.length, message: "Document text extracted and routed successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected document ingestion error.";
    return json({ error: message }, 500);
  }
});
