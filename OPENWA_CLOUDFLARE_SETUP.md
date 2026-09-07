# Isaacs & Partners — OpenWA + Cloudflare + Supabase Communication Wiring

## Architecture

```text
WhatsApp
   ↓
OpenWA (private host :2785)
   ↕ Cloudflare Tunnel
https://openwa.isaacsandpartners.online
   ↕
Supabase Edge Function: openwa-communication-worker
   ↕
Supabase communication_messages / communication_outbox
   ↕
AI Liaison runtime
```

OpenWA API credentials remain server-side. The browser only queues messages through the `queue_openwa_message` RPC.

## 1. Cloudflare

The repository tunnel configuration exposes the OpenWA API at:

`https://openwa.isaacsandpartners.online`

The local OpenWA API is expected on port `2785`, which is the default port for the current OpenWA API implementation.

On the machine running OpenWA and cloudflared:

```powershell
cloudflared tunnel route dns isaacs-partners-production-tunnel openwa.isaacsandpartners.online
cloudflared tunnel --config C:\path\to\tunnel-config.yml run isaacs-partners-production-tunnel
```

Use the actual location of `tunnel-config.yml` and the Cloudflare credentials file on the production host.

Do not commit the Cloudflare tunnel credentials file.

## 2. Verify OpenWA locally

OpenWA should be listening on port `2785`.

```powershell
curl http://127.0.0.1:2785/api/health
```

Then verify the session:

```powershell
curl -H "X-API-Key: YOUR_OPENWA_API_KEY" http://127.0.0.1:2785/api/sessions
```

The target session must exist and be connected before sending messages.

## 3. Verify OpenWA through Cloudflare

```powershell
curl https://openwa.isaacsandpartners.online/api/health
```

Then:

```powershell
curl -H "X-API-Key: YOUR_OPENWA_API_KEY" https://openwa.isaacsandpartners.online/api/sessions
```

Do not put the API key in GitHub, browser JavaScript, Cloudflare public configuration, or this document.

## 4. Supabase Edge Function secrets

Set these production secrets on the Supabase project:

```text
OPENWA_BASE_URL=https://openwa.isaacsandpartners.online
OPENWA_API_KEY=<OpenWA API key>
OPENWA_SESSION_ID=<OpenWA session UUID>
OPENWA_WEBHOOK_SECRET=<long random HMAC secret>
OPENWA_WORKER_TOKEN=<long random worker token>
```

The existing Supabase defaults provide the Supabase connection credentials required by the worker.

Set secrets with the Supabase CLI, for example:

```powershell
supabase secrets set OPENWA_BASE_URL=https://openwa.isaacsandpartners.online
supabase secrets set OPENWA_API_KEY=REPLACE_ME
supabase secrets set OPENWA_SESSION_ID=REPLACE_ME
supabase secrets set OPENWA_WEBHOOK_SECRET=REPLACE_ME
supabase secrets set OPENWA_WORKER_TOKEN=REPLACE_ME
```

Never commit real values.

## 5. Supabase Vault scheduler secret

The migration `202609070001_openwa_outbox_scheduler.sql` schedules the outbound worker every 15 seconds.

Create a Vault secret named exactly:

`openwa_worker_token`

Its value must be identical to `OPENWA_WORKER_TOKEN`.

Example SQL in the Supabase SQL Editor:

```sql
select vault.create_secret('REPLACE_WITH_THE_SAME_OPENWA_WORKER_TOKEN', 'openwa_worker_token');
```

If the secret already exists, update it rather than creating a duplicate.

## 6. Deploy the communication worker

Deploy the current function:

```powershell
supabase functions deploy openwa-communication-worker
```

The function intentionally has JWT verification disabled because it accepts two server-to-server authentication modes:

- HMAC signature for OpenWA inbound webhooks
- `X-OpenWA-Worker-Token` for outbound queue processing

The function itself performs the authentication checks.

## 7. Register the OpenWA webhook

Register the webhook against the OpenWA session using the same HMAC secret configured as `OPENWA_WEBHOOK_SECRET`.

```powershell
curl -X POST "https://openwa.isaacsandpartners.online/api/sessions/OPENWA_SESSION_ID/webhooks" `
  -H "Content-Type: application/json" `
  -H "X-API-Key: OPENWA_API_KEY" `
  -d '{
    "url": "https://aglobzjtstbfwcsdhvmp.supabase.co/functions/v1/openwa-communication-worker",
    "events": ["message.received", "message.sent", "message.ack", "message.failed"],
    "secret": "OPENWA_WEBHOOK_SECRET"
  }'
```

Replace placeholders with the real values locally. Do not commit the command with real secrets.

## 8. End-to-end test

### Outbound

1. Sign in as an authenticated client/staff user.
2. Queue a WhatsApp message through the application.
3. Confirm a `communication_messages` row is `QUEUED`.
4. Confirm a matching `communication_outbox` row is `QUEUED`.
5. Within the scheduler interval, the worker should claim the row.
6. OpenWA should receive `/api/sessions/{sessionId}/messages/send-text`.
7. The message should become `SENT` and receive an OpenWA message ID.
8. WhatsApp should receive the message.

### Inbound

1. Send a WhatsApp message to the connected OpenWA number.
2. OpenWA calls the Supabase webhook.
3. The HMAC signature is verified.
4. The message is persisted to `communication_messages`.
5. If the WhatsApp chat is registered to a known client, the existing AI Liaison runtime is invoked.
6. Any AI response is queued through the normal outbound communication path.
7. The outbound scheduler sends the response through OpenWA.

### Security tests

- Missing HMAC signature must be rejected.
- Invalid HMAC signature must be rejected.
- Missing/invalid worker token must return `403`.
- Browser code must never contain `OPENWA_API_KEY` or `OPENWA_WORKER_TOKEN`.
- A WhatsApp number not linked to a known client must not gain authenticated client context.
- Duplicate OpenWA deliveries must be idempotent.

## Production notes

The Cloudflare Tunnel is the network bridge to the private OpenWA host. It is not the location of the Supabase Edge Function. The production Edge Function remains on Supabase, while Cloudflare provides the secure public route to the private OpenWA API.
