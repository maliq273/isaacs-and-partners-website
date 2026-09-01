/**
 * Isaacs & Partners — PR40 Trusted Document Worker
 *
 * Server-side ingestion boundary. The browser never receives the service-role
 * key and never performs privileged document retrieval or AI/OCR work.
 *
 * This worker claims one queued job, retrieves the source from private
 * Supabase Storage, performs deterministic integrity checks, and delegates
 * document understanding to the configured server-side processor. A processor
 * can be supplied through the trusted runtime; no provider secret is stored
 * in source control.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Trusted document worker is not configured.");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MAX_ATTEMPTS = 3;
const LOCK_TIMEOUT_MINUTES = 15;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function sha256(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function claimJob() {
  const { data, error } = await supabase
    .from("client_document_ingestion_jobs")
    .select("*")
    .eq("status", "QUEUED")
    .lte("available_at", new Date().toISOString())
    .order("available_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const staleBefore = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60_000).toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("client_document_ingestion_jobs")
    .update({
      status: "PROCESSING",
      locked_at: new Date().toISOString(),
      attempts: Number(data.attempts || 0) + 1,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id)
    .eq("status", "QUEUED")
    .or(`locked_at.is.null,locked_at.lt.${staleBefore}`)
    .select()
    .maybeSingle();

  if (claimError) throw claimError;
  return claimed;
}

async function failJob(job: any, error: unknown) {
  const attempts = Number(job.attempts || 0);
  const message = error instanceof Error ? error.message : String(error);
  const retryable = attempts < MAX_ATTEMPTS;

  await supabase
    .from("client_document_ingestion_jobs")
    .update({
      status: retryable ? "QUEUED" : "FAILED",
      available_at: new Date(Date.now() + Math.min(attempts * 30_000, 300_000)).toISOString(),
      locked_at: null,
      last_error: message.slice(0, 2000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  await supabase
    .from("client_documents")
    .update({
      status: retryable ? "UPLOADED" : "FAILED",
      ingestion_status: "FAILED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.document_id);
}

async function processDocument(job: any) {
  const { data: document, error: documentError } = await supabase
    .from("client_documents")
    .select("*")
    .eq("id", job.document_id)
    .single();
  if (documentError) throw documentError;

  const { data: file, error: downloadError } = await supabase.storage
    .from(document.storage_bucket)
    .download(document.storage_path);
  if (downloadError) throw downloadError;
  if (!file) throw new Error("Private document could not be retrieved.");

  const buffer = await file.arrayBuffer();
  const actualSha256 = await sha256(buffer);
  if (document.sha256 && actualSha256 !== document.sha256) {
    throw new Error("Document integrity check failed: SHA-256 mismatch.");
  }

  await supabase
    .from("client_documents")
    .update({
      status: "PROCESSING",
      ingestion_status: "EXTRACTING",
      metadata: {
        ...(document.metadata || {}),
        worker: "trusted-document-worker",
        worker_started_at: new Date().toISOString(),
        verified_sha256: actualSha256,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id);

  /*
   * Provider-specific OCR/AI belongs here, behind a server-side adapter.
   * The worker deliberately fails closed when no processor is configured;
   * it must never manufacture document content.
   */
  const processorUrl = Deno.env.get("DOCUMENT_PROCESSOR_URL");
  if (!processorUrl) {
    throw new Error("DOCUMENT_PROCESSOR_URL is not configured.");
  }

  const processorToken = Deno.env.get("DOCUMENT_PROCESSOR_TOKEN");
  const processorResponse = await fetch(processorUrl, {
    method: "POST",
    headers: {
      "content-type": document.mime_type || "application/octet-stream",
      ...(processorToken ? { authorization: `Bearer ${processorToken}` } : {}),
      "x-document-id": document.id,
      "x-matter-id": document.matter_id || "",
    },
    body: buffer,
  });

  if (!processorResponse.ok) {
    throw new Error(`Trusted document processor returned HTTP ${processorResponse.status}.`);
  }

  const result = await processorResponse.json();

  const needsClarification = result?.needs_clarification === true;
  const finalIngestionStatus = needsClarification ? "INDEXING" : "COMPLETE";

  await supabase
    .from("client_documents")
    .update({
      status: "READY",
      ingestion_status: finalIngestionStatus,
      document_type: result?.document_type || document.document_type,
      metadata: {
        ...(document.metadata || {}),
        processing: result,
        worker_completed_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id);

  await supabase
    .from("client_document_ingestion_jobs")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      locked_at: null,
      metadata: { result_summary: result?.summary || null, needs_clarification },
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  return { documentId: document.id, needsClarification };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
      return json({ error: "Forbidden." }, 403);
    }

    const job = await claimJob();
    if (!job) return json({ processed: false, message: "No queued document jobs." });

    try {
      const result = await processDocument(job);
      return json({ processed: true, jobId: job.id, ...result });
    } catch (error) {
      await failJob(job, error);
      console.error("Trusted document worker failed", error);
      return json({ processed: false, jobId: job.id, error: "Document processing failed." }, 500);
    }
  } catch (error) {
    console.error("Trusted document worker request failed", error);
    return json({ error: "Worker execution failed." }, 500);
  }
});
