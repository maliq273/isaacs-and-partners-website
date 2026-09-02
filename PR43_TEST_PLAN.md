# PR43 — OpenWA Communication Worker Test Plan

## Purpose
Validate that WhatsApp communication between Isaacs & Partners and customers is routed through the self-hosted OpenWA transport without exposing OpenWA credentials to the browser.

## Repository checks
1. `app/services/OpenWACommunicationService.js` contains no API key, session secret or service-role key.
2. `supabase/functions/openwa-communication-worker/index.ts` is the only OpenWA transport boundary.
3. `supabase/config.toml` registers `openwa-communication-worker` with JWT verification disabled because the function performs its own webhook HMAC and worker-token authentication.

## Database
1. Apply `202609010006_openwa_communication_worker.sql`.
2. Apply `202609010007_openwa_contacts.sql`.
3. Confirm `communication_messages`, `communication_outbox` and `communication_contacts` exist.
4. Confirm the authenticated RPC `queue_openwa_message(text,text,uuid,text)` exists.
5. Confirm clients can only read their own messages and staff/Super Admin can read communication records according to policy.
6. Confirm clients cannot directly write to `communication_outbox`.

## Outbound flow
1. Authenticated client calls `OpenWACommunicationService.queueWhatsAppMessage()`.
2. RPC creates an OUTBOUND `communication_messages` row with `QUEUED` status.
3. RPC creates the corresponding `communication_outbox` row.
4. Trusted worker claims one queued row atomically.
5. Worker calls OpenWA `POST /api/sessions/{sessionId}/messages/send-text` with `X-API-Key` from an Edge Function secret.
6. On success, message becomes `SENT` and OpenWA message ID is persisted.
7. On transport failure, the row retries with backoff and becomes `FAILED` after five attempts.

## Inbound flow
1. Configure OpenWA webhook for `message.received`, `message.sent`, `message.ack` and `message.failed`.
2. OpenWA sends `X-OpenWA-Signature`.
3. Worker verifies HMAC-SHA256 over the exact raw request body.
4. Invalid signatures return HTTP 401 and create no message.
5. Valid `message.received` events create an INBOUND message.
6. `idempotencyKey` prevents duplicate webhook deliveries.
7. Known contacts are mapped through `communication_contacts`.
8. Known customers receive an in-app WHATSAPP notification record.
9. Sent/ack/failed events update the matching outbound message.

## OpenWA runtime
OpenWA is self-hosted and provides REST API, multi-session support and HMAC-signed webhooks. The project documentation warns that it is an unofficial WhatsApp gateway using reverse-engineered WhatsApp clients, so a dedicated business number and a fallback channel are required for revenue/authentication-critical communication.

## Required secrets
Configure in Supabase Edge Function secrets, never in GitHub/browser:
- `OPENWA_BASE_URL`
- `OPENWA_API_KEY`
- `OPENWA_SESSION_ID`
- `OPENWA_WEBHOOK_SECRET`
- `OPENWA_WORKER_TOKEN`

Existing Supabase secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Manual OpenWA webhook setup
After OpenWA is running and the Edge Function URL is deployed, create a session webhook using the OpenWA API with:
- URL = deployed `openwa-communication-worker` function URL
- events = `message.received`, `message.sent`, `message.ack`, `message.failed`
- secret = exactly `OPENWA_WEBHOOK_SECRET`

Do not place the OpenWA API key in frontend code.

## Acceptance
- Customer can queue a WhatsApp message from the website.
- Worker sends it through OpenWA.
- Customer communication history is visible through RLS-authorised application views.
- Incoming WhatsApp replies reach the customer communication record.
- Duplicate webhook deliveries are ignored.
- Invalid webhook signatures are rejected.
- OpenWA/API credentials are absent from browser bundles and repository source.
