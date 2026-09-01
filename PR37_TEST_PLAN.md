# PR37 — Secure Document Ingestion Test Plan

## Objective

Verify that confidential client documents can be uploaded into the private Supabase Storage vault, registered in `public.client_documents`, and handed to the trusted ingestion queue without exposing service-role credentials or weakening RLS.

## Migration checks

1. Confirm `202609010004_secure_document_ingestion_queue.sql` is the next unapplied migration.
2. Run `npx supabase db push --dry-run`.
3. Apply with `npx supabase db push` only after the dry run is correct.
4. Confirm `public.client_document_ingestion_jobs` exists.
5. Confirm RLS is enabled on the queue table.
6. Confirm normal authenticated users do not receive queue rows directly.
7. Confirm `queue_client_document_ingestion(uuid)` is executable by `authenticated` and `service_role`, but not `anon`/`PUBLIC`.

## Upload checks

1. Sign in as a client.
2. Upload an allowed PDF under 50 MB.
3. Confirm the object is created under `client-documents/<client-id>/...` and the bucket remains private.
4. Confirm one `client_documents` row is created.
5. Confirm `sha256` is populated.
6. Confirm `ingestion_status = PENDING`.
7. Confirm one `client_document_ingestion_jobs` row is created with `status = QUEUED`.
8. Confirm the original file is not stored in GitHub.
9. Confirm the browser does not contain a service-role, OpenAI, or GitHub secret.

## Authorisation checks

1. Client A cannot read Client B's document metadata.
2. Client A cannot download Client B's Storage object.
3. Assigned active staff can access documents belonging to their assigned matter.
4. Unassigned staff cannot access the matter's documents.
5. Staff cannot create a general/unscoped upload; their upload must include a matter.
6. Super admin can access authorised documents.
7. Anonymous users cannot upload, read, or queue documents.

## Validation checks

1. Empty file is rejected.
2. File above 50 MB is rejected.
3. Unsupported MIME type is rejected when the browser reports a MIME type.
4. Filename is sanitised before it becomes part of the Storage path.
5. Duplicate uploads receive unique object paths.
6. If the metadata insert fails, the uploaded Storage object is deleted.
7. If queue registration fails, the uploaded Storage object is deleted and the metadata record remains subject to normal transaction/error handling.
8. SHA-256 is deterministic for the same file contents.

## Worker boundary checks

The browser only creates the queue hand-off. It must not perform OCR, embedding generation, OpenAI calls, or privileged Storage operations. Those operations belong to the trusted worker/Edge Function layer implemented after PR37.
