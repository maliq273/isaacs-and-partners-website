# Isaacs & Partners — OpenWA + Cloudflare + Supabase Communication Wiring

## Production architecture

```text
WhatsApp
   ↕
OpenWA on Azure VM :2785
   ↕
Cloudflare Tunnel: isaacs-openwa
   ↕
https://openwa.isaacsandpartners.online
   ↕
Supabase Edge Function: openwa-communication-worker
   ↕
communication_messages / communication_outbox
   ↕
AI Liaison runtime / Anthony Isaacs
```

Azure is the WhatsApp transport node. Supabase remains the communication control plane and AI brain. OpenWA API credentials remain server-side; browser code only queues messages through the existing communication RPC.

## 1. Azure + Cloudflare

Production OpenWA is exposed only through:

`https://openwa.isaacsandpartners.online`

The Azure OpenWA API listens privately on `127.0.0.1:2785`. The existing Cloudflare tunnel is `isaacs-openwa`; do not create a second tunnel.

Cloudflare ingress routes:

```yaml
ingress:
  - hostname: openwa.isaacsandpartners.online
    service: http://127.0.0.1:2785
  - service: http_status:404
```

Cloudflare WAF has a narrow server-to-server exception for this hostname's `/api/*` path which skips Super Bot Fight Mode rules only. Other WAF protections remain active.

The Supabase OpenWA client uses the integration User-Agent:

`IsaacsPartners-OpenWA/1.0`

This avoids Cloudflare bot challenges for legitimate server-to-server OpenWA API traffic without disabling Cloudflare security globally.

## 2. Supabase Edge Function secrets

The production worker requires these server-side values:

```text
OPENWA_BASE_URL=https://openwa.isaacsandpartners.online
OPENWA_API_KEY=<OpenWA API key>
OPENWA_SESSION_ID=<OpenWA session UUID>
OPENWA_WEBHOOK_SECRET=<long random HMAC secret>
OPENWA_WORKER_TOKEN=<long random worker token>
```

Never commit real values to GitHub, browser JavaScript, or this document.

The existing worker token is also stored in Supabase Vault as:

`openwa_worker_token`

The webhook HMAC secret is stored in Vault as:

`OPENWA_WEBHOOK_SECRET`

## 3. Outbound worker

`openwa-communication-worker` is deployed with JWT verification disabled because it accepts two controlled server-to-server authentication modes:

- `X-OpenWA-Worker-Token` for the Supabase scheduler/outbound worker path.
- `X-OpenWA-Signature` HMAC for OpenWA inbound webhook delivery.

The worker sends:

```text
POST /api/sessions/{OPENWA_SESSION_ID}/messages/send-text
```

with the OpenWA API key held only in the Edge Function environment.

It also sends the integration User-Agent so the Cloudflare WAF exception applies only to this legitimate integration traffic.

## 4. Automatic webhook registration

The worker now self-registers the OpenWA webhook when processing the outbound queue. This removes a fragile manual registration dependency.

The registered events are:

```text
message.received
message.sent
message.ack
message.failed
```

The target is:

`https://aglobzjtstbfwcsdhvmp.supabase.co/functions/v1/openwa-communication-worker`

The same `OPENWA_WEBHOOK_SECRET` is used for HMAC verification.

Webhook registration is cached per Edge Function instance for five minutes and treats an existing webhook response as non-fatal.

## 5. Outbound scheduler

The existing Supabase cron job `openwa-communication-worker` is active every 15 seconds.

It calls the worker with the Vault value `openwa_worker_token` using `X-OpenWA-Worker-Token`.

Flow:

```text
communication_outbox QUEUED
        ↓
Supabase cron every 15 seconds
        ↓
openwa-communication-worker
        ↓
Cloudflare
        ↓
Azure OpenWA
        ↓
WhatsApp
```

The worker claims queued rows, retries transient failures, records the OpenWA message ID, and updates communication status.

## 6. Inbound WhatsApp flow

```text
WhatsApp
   ↓
Azure OpenWA
   ↓
Cloudflare Tunnel
   ↓
openwa-communication-worker
   ↓
HMAC verification
   ↓
communication_messages
   ↓
AI Liaison runtime
   ↓
Anthony Isaacs
   ↓
communication_outbox
   ↓
Azure OpenWA
   ↓
WhatsApp
```

Known customer identity is resolved from `communication_contacts` by phone number first and canonical WhatsApp chat ID second. Group, broadcast and newsletter destinations are blocked from the automated direct-message transport.

The existing Customer Relationship Memory Engine and historical-memory architecture remain in Supabase; Azure does not contain or replace Anthony's business/relationship memory.

## 7. Security model

- OpenWA API key stays server-side.
- Worker token stays server-side and in Supabase Vault for the scheduler.
- Webhook HMAC secret stays server-side.
- Browser JavaScript never calls OpenWA directly.
- Cloudflare is the public network boundary.
- OpenWA remains bound privately behind the tunnel.
- WAF exception is restricted to `openwa.isaacsandpartners.online/api/*` and Super Bot Fight Mode.
- Group/broadcast WhatsApp destinations are blocked by the worker.
- Duplicate webhook deliveries are handled idempotently.
- Unknown WhatsApp numbers do not receive authenticated client context merely by messaging the business.

## 8. Production state

The intended production chain is now:

`Client/Staff → Supabase communication layer → OpenWA worker → Cloudflare → Azure OpenWA → WhatsApp`

and inbound:

`WhatsApp → Azure OpenWA → Cloudflare → Supabase worker → Anthony → communication_outbox → Azure OpenWA → WhatsApp`

No AI or relationship-memory state is moved to Azure; Azure remains the WhatsApp transport runtime.
