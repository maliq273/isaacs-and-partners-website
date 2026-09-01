# PR40 — Trusted Document Worker Test Plan

## Purpose

Validate that confidential documents are processed only through the trusted server-side worker boundary and that failures never result in fabricated document content.

## Preconditions

- PR37 private document vault is applied.
- PR37 ingestion queue is applied.
- `client-documents` Storage bucket is private.
- `SUPABASE_SERVICE_ROLE_KEY` exists only in the Edge Function runtime.
- `DOCUMENT_PROCESSOR_URL` points to the approved server-side OCR/document-understanding processor.
- `DOCUMENT_PROCESSOR_TOKEN` is configured as a server-side secret when required by the processor.

## Tests

### 1. Worker authentication

- Call the worker without an Authorization header.
- Expected: HTTP 403.
- Confirm no queue job is processed.

### 2. Invalid bearer token

- Call the worker with a normal user access token.
- Expected: HTTP 403.
- Confirm the worker does not trust browser credentials as the service-role boundary.

### 3. Empty queue

- Invoke the worker when no job is QUEUED and available.
- Expected: successful response indicating no queued job.

### 4. Successful document

- Upload a valid document through `PrivateDocumentVault`.
- Confirm one QUEUED ingestion job exists.
- Invoke the worker with the trusted runtime credential.
- Expected job state: `COMPLETED`.
- Expected document state: `READY` / `COMPLETE`.
- Confirm the source remains in private Storage.

### 5. Integrity failure

- Change the stored object's bytes without changing the recorded SHA-256.
- Invoke the worker.
- Expected: processing fails closed and document is marked `FAILED` after retry exhaustion.
- Confirm no extracted content is accepted as valid.

### 6. Processor failure

- Make the processor unavailable or return a non-2xx response.
- Expected: job returns to `QUEUED` while attempts remain, then becomes `FAILED` at the retry limit.
- Confirm the document becomes `FAILED` only after retry exhaustion.

### 7. Unreadable section / clarification

- Submit a scan containing an intentionally unreadable field.
- Processor must return `needs_clarification: true` and identify the unclear content in its result.
- Expected: worker stores the processor result as processing metadata and does not invent the value.
- The PR39 clarification workflow remains responsible for asking the authorised user for the missing interpretation.

### 8. Private Storage access

- Attempt direct access to the bucket without an authorised signed URL.
- Expected: denied.
- Confirm worker uses server-side Storage access only.

### 9. Browser secret check

- Search the application source for `SUPABASE_SERVICE_ROLE_KEY`, `DOCUMENT_PROCESSOR_TOKEN`, and provider API secrets.
- Expected: no runtime secret values in browser code.

### 10. Concurrent workers

- Trigger multiple worker invocations against one queued job.
- Expected: only one invocation claims the job; no duplicate processing should be accepted.

## Deployment

1. Deploy the Edge Function from the repository.
2. Configure runtime secrets in Supabase; never commit them.
3. Invoke the function with the trusted scheduler/worker mechanism.
4. Run the tests above.
5. Confirm `npx supabase db push --dry-run` reports no unexpected migrations.
