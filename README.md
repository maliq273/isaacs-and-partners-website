# Isaacs & Partners Website / Client Platform

**Repository:** `maliq273/isaacs-and-partners-website`  
**Branch:** `main`  
**Current audited commit:** `92f88ed32d6a0049b00e63c99f62ec0d0411025d`  
**Last audit:** 2026-09-11

## Current position

The project has moved beyond the original website build into the integrated **client + AI + staff + Super Admin communication control plane**.

The core architecture is now aligned around one principle:

```text
Customer
   ↓
Anthony
   ↓
AI Liaison Runtime
   ↓
Truth + Relationship + Operational Intelligence
   ↓
Authority / Permissions
   ↓
AI response OR authorised human intervention
   ↓
Anthony
   ↓
Customer
```

Anthony is the client-facing AI identity. He is not a human employee and cannot grant himself authority.

## Phase status

### Phase 1 — Website / application foundation

🟢 **Complete**

Public website, repository structure, application architecture, authentication foundation, core routes and public contact/consultation foundation are in place.

### Phase 2 — Supabase control plane

🟢 **~95%**

Database foundation, RLS, roles, staff permissions, company data, communication records, AI conversations, interventions and supporting RPCs are substantially implemented.

Remaining work is production reconciliation, regression testing and final security review rather than a new architecture.

### Phase 3 — Client / business / matter platform

🟢 **~90%**

Client, business, matter and dashboard architecture exists with authenticated client context and ownership checks.

Remaining work is mainly production validation and completion of individual operational modules.

### Phase 4 — Company Truth

🟢 **~90%**

Approved company knowledge, service information, pricing/catalogue data and company-policy hierarchy are integrated into TruthFusion.

Truth hierarchy now prioritises:

1. Super Admin instruction
2. Live authenticated client/staff/matter records
3. Company policy/pricing
4. Company knowledgebase
5. Customer-originated historical memory
6. General model knowledge

### Phase 5 — AI architecture

🟢 **~95%**

The AI stack now includes:

```text
AI Provider
   ↓
TruthFusion
   ↓
Company Truth
   ↓
Customer Memory
   ↓
Historical Retrieval
   ↓
Relationship State
   ↓
Operational Intelligence
   ↓
Anthony
```

General model reasoning is combined with Isaacs & Partners authoritative information rather than replacing it.

### Phase 6 — Public AI / consultation

🟢 **~90%**

Public consultation and lead architecture exists and uses the shared AI/company-truth foundation.

Remaining work is production browser validation and final public enquiry persistence verification.

### Phase 7 — Authenticated AI / client relationship

🟢 **~90%**

Persistent conversations, client context, customer memory, historical recall, operational context and human intervention architecture are implemented.

The client-facing AI identity is now **Anthony**.

### Phase 8 — Authority & Role Intelligence

🟢 **~90% — newly integrated**

Implemented:

- `AuthorityRoleIntelligenceEngine`
- authoritative `authority_directory`
- exact WhatsApp-number identity matching
- active-number verification
- ambiguous-number denial
- profile-phone conflict detection
- staff-record verification
- staff AI permission verification
- Super Admin authority
- Director / Shareholder / Partner / Staff / Stakeholder organisational roles
- Super Admin **Authority & People** dashboard
- authority administration Edge Function
- authority audit foundation

Current seeded authority records:

- **Adul Maaliek Isaacs** — `27718831097` — Super Admin / Director
- **Stephanie Byleveldt** — `27793185281` — Super Admin

Important rule:

> WhatsApp display names and claims made inside a conversation do not grant authority. The verified transport number must match the active authority directory.

### Phase 9 — AI ↔ Staff intervention control plane

🟢 **~85% — newly integrated**

The intended traffic flow is now represented in the system:

```text
CUSTOMER
   ↓
ANTHONY
   ↓
Needs authorised human?
   ↓
AI_ESCALATED / HUMAN_ACTIVE
   ↓
Authorised Staff
   ↓
Staff response
   ↓
Anthony review / safety filtering
   ↓
Client-safe response
   ↓
CUSTOMER
```

Anthony can hold the conversation while an authorised team member is brought into the flow.

The existing intervention control plane supports staff and Super Admin responses. Staff authority is still governed by explicit permissions.

A dedicated `ai-review-staff-response` Edge Function now reviews staff drafts before client relay. It is JWT protected.

### Phase 10 — WhatsApp / OpenWA

🟡 **~80%**

The architecture is now substantially wired:

```text
WhatsApp
   ↓
OpenWA
   ↓
openwa-communication-worker
   ↓
ai-liaison-runtime
   ↓
Anthony
   ↓
communication_outbox
   ↓
OpenWA
   ↓
WhatsApp
```

Implemented:

- OpenWA webhook worker
- direct-chat restrictions
- HMAC verification
- WhatsApp chat-ID handling
- LID handling safeguards
- inbound message persistence
- AI runtime invocation
- outbound communication queue
- Anthony identity
- authority resolution from WhatsApp number
- human intervention routing

The OpenWA session has previously been verified as `ready` in the local deployment.

Remaining work:

- final real-world end-to-end message test
- verify staff intervention over the live WhatsApp path
- verify Anthony-reviewed staff response returns to the correct customer
- production infrastructure hardening

### Phase 11 — Client dashboard communication

🟢 **~90%**

The client dashboard Messages / Anthony entry now opens the WhatsApp conversation with Anthony.

The public website WhatsApp action also points to the Isaacs & Partners WhatsApp endpoint used for Anthony.

The remaining work is to complete browser-level validation and ensure all dashboard communication surfaces use the same communication service without duplicate implementations.

### Phase 12 — Relationship & Operational Intelligence

🟢 **~85%**

Implemented:

- customer relationship state
- customer-originated memory
- historical memory retrieval
- relationship commitments
- operational state model
- operational intelligence engine
- matter context
- appointment context
- outstanding documents
- staff ownership context
- portfolio attention level
- next action / next action due

The operational intelligence layer is read-only and never grants authority.

### Phase 13 — Private documents / AI document processing

🟡 **~65%**

Secure document storage and trusted document-worker architecture exist.

Still required:

```text
Private Storage
   ↓
Trusted Document Worker
   ↓
PDF/DOCX/OCR
   ↓
Classification
   ↓
Quality
   ↓
Extraction
   ↓
Chunking
   ↓
Embeddings
   ↓
pgvector
   ↓
Knowledge retrieval
   ↓
TruthFusion
```

### Phase 14 — Quotes / invoices / financial controls

🟡 **~75%**

The financial control foundation exists, including Zoho-style invoice direction and payment-state architecture.

Remaining work includes full production payment integration and final financial workflow validation.

### Phase 15 — Immigration automation

🟡 **~55%**

Architecture exists for immigration qualification, document requirements and application workflow.

Full DHA/VFS production automation and validation remain outstanding.

### Phase 16 — Production hardening

🟡 **~60%**

The project is no longer at the earlier ~45% production-hardening state. Major control-plane work has now been implemented.

Still required:

- full automated test execution
- browser regression testing
- Supabase production reconciliation
- Edge Function dependency alignment
- RLS/security audit
- storage security audit
- secrets verification
- CORS/CSP review
- rate limiting
- brute-force protection
- upload abuse protection
- prompt-injection testing
- cross-client data leakage testing
- real WhatsApp end-to-end testing
- production monitoring/error handling

## Current implementation alignment audit

### 🟢 Architecturally aligned

The following major pieces now agree on the same architecture:

- Authority & People
- Authority directory
- WhatsApp identity verification
- AI Liaison Runtime
- Anthony identity
- Customer memory
- Historical memory retrieval
- Relationship state
- Operational intelligence
- Human intervention
- Staff permissions
- Super Admin override
- Client dashboard → Anthony WhatsApp
- Staff response → Anthony review → client relay

### 🟡 Repository source alignment still required

One important technical cleanup remains before declaring the repository and deployed runtime fully aligned.

`ai-liaison-runtime/index.ts` currently imports several AI modules using older immutable Git commit pins while the corresponding files on `main` have newer SHAs. The runtime itself is deployed and functional, but the repository should be normalised so its import pins explicitly reference the current approved versions.

Known drift includes the runtime pins for:

- `WhatsAppAgent.js`
- `AIProviderService.js`
- `CompanyTruthService.js`
- `TruthFusionEngine.js`
- `HistoricalMemoryRetrievalService.js`
- `CustomerRelationshipMemoryEngine.js`
- `RelationshipOperationalIntelligenceEngine.js`
- `AuthorityRoleIntelligenceEngine.js`

This is a **source/deployment reproducibility issue**, not a reason to redesign the architecture. It should be corrected before the next production deployment.

## Current Edge Functions

The current Supabase project includes the following relevant functions:

- `ai-liaison-runtime`
- `openwa-communication-worker`
- `admin-authority-directory`
- `ai-review-staff-response`
- `admin-create-staff`
- `admin-manage-account`
- `admin-github-config`
- `admin-upload-brand-asset`
- `admin-organisation-document-ingest`
- `trusted-document-worker`

The AI liaison runtime has been deployed through the current authority/Anthony work and the latest known deployed version is **v35**.

## Current build order

Do **not** start another unrelated feature yet.

The next work should be performed in this order:

### 1. Repository dependency-pin reconciliation

Make `ai-liaison-runtime` import the exact current approved AI/relationship/authority modules from `main`.

Then redeploy the runtime and verify the deployed version matches the repository.

### 2. Authority test matrix

Test at minimum:

- Adul's verified WhatsApp number → Super Admin / Director
- Stephanie's verified WhatsApp number → Super Admin
- unknown WhatsApp number → unauthenticated contact
- LID-only identity → no authority elevation
- conflicting profile phone → deny
- duplicate active authority number → deny
- staff without permission → deny
- staff with permission → allow only permitted capability

### 3. Real WhatsApp end-to-end test

Test:

```text
Customer → WhatsApp → OpenWA → Anthony
```

Then test:

```text
Customer → Anthony → Human escalation
                    ↓
                  Staff
                    ↓
              Anthony review
                    ↓
                Customer
```

### 4. Browser regression test

Validate:

- public WhatsApp icon
- public AI/consultation
- client dashboard
- Messages / Anthony
- WhatsApp handoff
- Super Admin dashboard
- Authority & People
- Staff & Permissions
- AI intervention console

### 5. Full production reconciliation

Verify actual Supabase state against the repository:

- migrations
- tables
- RPCs
- RLS policies
- storage buckets
- storage policies
- Edge Functions
- secrets
- triggers
- indexes

### 6. Automated production check

Create/complete:

```text
npm test
npm run production-check
```

The production check should detect:

- syntax errors
- missing imports
- stale Git pins
- missing modules
- broken routes
- API/RPC references
- environment requirements
- duplicate AI engines
- secret leakage
- broken assets
- unsafe client-side authority assumptions

### 7. Finish document AI

Complete the trusted document processing pipeline.

### 8. Finish financial/payment gate

Implement and test:

```text
Quote approved
      ↓
50% deposit required
      ↓
Payment verified
      ↓
Work unlocked
      ↓
Final 50%
      ↓
Submission/application release
```

### 9. Finish immigration automation

Then complete the DHA/VFS workflow.

### 10. Final security and production audit

Only after the above should the system be treated as production-ready.

## Current status summary

| Area | Status |
|---|---|
| Public website | 🟢 Complete |
| Application foundation | 🟢 Complete |
| Supabase control plane | 🟢 ~95% |
| Client / matter platform | 🟢 ~90% |
| Company Truth | 🟢 ~90% |
| AI architecture | 🟢 ~95% |
| Persistent AI memory | 🟢 ~90% |
| Relationship intelligence | 🟢 ~85% |
| Operational intelligence | 🟢 ~85% |
| Authority & People | 🟢 ~90% |
| Human intervention | 🟢 ~85% |
| Anthony identity | 🟢 Integrated |
| Client → Anthony WhatsApp | 🟢 Integrated |
| Staff → Anthony → Client relay | 🟢 Architecture integrated / testing required |
| OpenWA | 🟡 ~80% |
| Private document AI | 🟡 ~65% |
| Quotes / invoices | 🟡 ~75% |
| Immigration automation | 🟡 ~55% |
| Production hardening | 🟡 ~60% |

## Bottom line

The project is now in the **integration and production-validation stage**, not the feature-discovery stage.

The most important architecture is now in place:

> **Anthony is the controlled communication layer between customers and Isaacs & Partners, while Authority & People determines who inside the organisation is actually authorised to act.**

The next technical action is **repository dependency-pin reconciliation**, followed by the real WhatsApp customer → Anthony → staff → Anthony → customer test.
