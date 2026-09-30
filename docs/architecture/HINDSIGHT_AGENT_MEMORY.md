
# Hindsight Agent Memory — Isaacs & Partners

## Purpose

Hindsight is the learned-memory layer for Anthony and future service agents.

It does not replace:
1. Super Admin / Director instructions
2. authenticated live Supabase records
3. approved company policy and pricing
4. approved company knowledge
5. existing customer-originated historical memory in Supabase

Hindsight sits below those authoritative layers and above ordinary model reasoning.

## Memory flow

Inbound message
    ↓
Identity + permission checks
    ↓
Supabase live truth
    ↓
Existing historical customer memory
    ↓
Hindsight recall
    ↓
Anthony reasoning
    ↓
Response / authorised action
    ↓
Durable learning event
    ↓
Hindsight retain

## Scopes

- anthony:client:<contact-id> — client-specific durable preferences and patterns.
- anthony:staff:<user-id> — staff-specific working preferences and interaction patterns.
- anthony:matter:<matter-id> — reserved for future matter-scoped learned workflow context.
- anthony:global:learned — generalised agent lessons containing no customer-identifying information.

The runtime must never use a client bank as a global knowledge source.

## What is retained

Retain durable facts, preferences, corrections, decisions and reusable interaction outcomes. Do not retain credentials, access tokens, payment-card data, raw authentication material or transient process chatter.

For production banks, Memory Defense is enabled with the sensitive_data redaction rule. Hindsight documents that this feature screens retain content before storage; self-hosted open-source Hindsight provides the sensitive-data detector, while additional prompt-injection blocking is a Cloud Enterprise capability.

## Learned memory is not truth

A recalled Hindsight item must be injected into prompts as untrusted learned context. It may suggest a pattern but cannot override a current matter record, price, payment status, permission, legal source or human approval.

## Configuration

Set these Supabase Edge Function secrets:
- HINDSIGHT_ENABLED=true
- HINDSIGHT_API_URL=https://api.hindsight.vectorize.io for Hindsight Cloud, or the internal URL of a self-hosted deployment.
- HINDSIGHT_API_KEY=<server-side key>
- HINDSIGHT_TENANT=default

Never expose the Hindsight API key to browser code.

## Deployment

The repository intentionally does not vendor the full Hindsight source tree. Hindsight is a separately maintained MIT-licensed service. The integration boundary lives in supabase/functions/_shared/hindsight.ts, allowing Hindsight to be self-hosted or consumed as Hindsight Cloud without changing Anthony's application architecture.

The pinned production baseline for this integration is Hindsight v0.10.2, released 29 September 2026.

## Failure behaviour

If Hindsight is unavailable, Anthony continues with Supabase/company truth and existing historical retrieval. Memory failure must never block a client response or authorised operational action.
