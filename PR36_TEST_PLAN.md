# PR36 — Private Document Vault Test Plan

## Migration ordering

1. Run `npx supabase migration list`.
2. Confirm the local migration sequence is unique and ordered: `202609010001_canonicalise_brand_asset_urls.sql`, `202609010002_client_business_matter_access.sql`, `202609010003_private_document_vault.sql`.
3. Run `npx supabase db push --dry-run`.
4. Before deployment, the dry run should show those three migrations as pending if none has previously been deployed.
5. Do not push until the migration list is reviewed.

## Database

1. After deployment, confirm `public.client_documents` exists.
2. Confirm RLS is enabled.
3. Confirm client/staff/admin policies exist.
4. Confirm `client_documents.matter_id` matches the existing `public.matters.id` type.
5. Confirm the `client-documents` Storage bucket exists and `public = false`.
6. Confirm Storage object policies exist for SELECT/INSERT/UPDATE/DELETE.

## Security

- No service-role key in frontend code.
- No OpenAI secret in frontend code.
- No GitHub token in frontend code.
- Public bucket access must remain disabled.
- Signed URLs must be short-lived.
- A client may only read their own documents.
- Assigned staff may only read documents belonging to matters assigned to them.
- Super Admin may administer documents.
- A client cannot upload into another client's storage prefix.
- Storage access and database access must agree; passing a database query must not bypass Storage RLS.

## Upload lifecycle

Browser → authenticated Supabase Storage upload → `client_documents` metadata record → future ingestion worker.

Storage paths are:

`client_id/matter_id/random-file-name`

or, for client-level files without a matter:

`client_id/general/random-file-name`

If metadata creation fails, the uploaded object is removed to avoid orphaned confidential files.

## Ingestion boundary

PR36 deliberately stops at secure storage and metadata registration. OCR, classification, extraction, chunking and vector indexing will be implemented in PR37 so each stage can be independently tested and audited.
