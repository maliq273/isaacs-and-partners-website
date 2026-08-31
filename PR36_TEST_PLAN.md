# PR36 — Private Document Vault Test Plan

## Database

1. Run `npx supabase migration list`.
2. Run `npx supabase db push --dry-run` and confirm only `202609010002_private_document_vault.sql` is pending.
3. Do not push until the dry run is reviewed.
4. After deployment, confirm `public.client_documents` exists.
5. Confirm RLS is enabled.
6. Confirm client/staff/admin policies exist.
7. Confirm the `client-documents` Storage bucket exists and is PRIVATE.

## Security

- No service-role key in frontend code.
- No OpenAI secret in frontend code.
- No GitHub token in frontend code.
- Public bucket access must remain disabled.
- Signed URLs must be short-lived.
- A client may only read their own documents.
- Assigned staff may only read documents belonging to matters assigned to them.
- Super Admin may administer documents.

## Upload lifecycle

Browser → authenticated Supabase Storage upload → `client_documents` metadata record → future ingestion worker.

If metadata creation fails, the uploaded object is removed to avoid orphaned confidential files.

## Ingestion boundary

PR36 deliberately stops at secure storage and metadata registration. OCR, classification, extraction, chunking and vector indexing will be implemented in the next ingestion PR so that each stage can be independently tested and audited.
