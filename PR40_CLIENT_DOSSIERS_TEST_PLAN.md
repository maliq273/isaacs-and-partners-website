# PR40 — Client Dossiers Storage Test Plan

## 1. Migration

Run:

```bash
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

Expected: `202609010005` appears on Local and Remote and dry-run reports the database is up to date.

## 2. Bucket

Confirm `client-dossiers` exists and `public = false` with a 50 MB file limit.

## 3. Canonical paths

Allowed upload shape:

`<profile-or-business-id>/<matter-id>/staging/<filename>`

A normal authenticated client/staff upload must be rejected if it attempts:

- another owner's folder;
- a missing matter segment;
- a fourth folder level;
- `verified` during upload;
- a path containing `..` or an arbitrary folder.

## 4. Access isolation

- Client A can upload/read only its own matter dossier.
- Client A cannot read Client B's dossier.
- Staff can access only matters to which they are actively assigned.
- Super Admin can access all dossier objects.
- DELETE is Super Admin only.

## 5. Verification flow

1. Upload lands in `staging`.
2. Super Admin reviews the document.
3. Control plane calls `verifyAndMove(document)`.
4. Object moves to `verified`.
5. `client_documents.storage_path` changes to the verified path.
6. `verified_at` and `verified_by` are populated.
7. Verification metadata is retained.

## 6. Restricted serving

Use `createSignedUrl(document, 300)` only. Never create public URLs for dossier files. Confirm the signed URL expires after the configured short TTL.

## 7. Confidentiality

- No service-role key in browser code.
- No AI provider key in browser code.
- No dossier files committed to GitHub.
- Bucket remains private.

## 8. Regression

Confirm the existing `client-documents` bucket and PR36/PR37 records remain intact until an explicit data migration is performed. Do not delete the legacy bucket as part of PR40.
