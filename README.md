# Isaacs & Partners Website / Client Platform

**Repository:** `maliq273/isaacs-and-partners-website`  
**Branch:** `main`  
**Current audited commit:** `105a30d37de804284f04a4952c8ec5b71a34b81e`  
**Last audit date:** 2026-09-05

This repository is the integrated Isaacs & Partners public website and client-platform codebase. It is more than a static website: it contains the public website, authentication, client/staff/admin dashboard layers, AI Liaison architecture, consultation/matter domain, knowledgebase, workflow services, repositories, storage adapters, document/upload processing, and Supabase/serverless integration.

## 1. Current build position

### Completed / working foundation

- Public Isaacs & Partners website structure is in place.
- Canonical company logo is `assets/logo.png` and the old `logo%20.png` / `images/logo.png` references have been removed from live application pages.
- Public AI Liaison is wired to the existing `WhatsAppAgent` architecture. It is **not** a second AI engine.
- Public AI Liaison has a governed four-category service directory:
  1. Immigration Services
  2. HR & Industrial Relations
  3. Business Compliance
  4. Legal Services
- Public AI service selection, common typo correction, qualification flow, local conversation memory, account CTAs, and public-lead response generation exist.
- Client Messages page is wired to the server-side AI Liaison runtime.
- AI Liaison runtime and existing WhatsAppAgent integration have been established.
- Commercial policy rules exist so the AI does not invent quotations or falsely claim payment.
- Client portal access-control work and Supabase migrations have been designed/implemented in the broader application stack; final end-to-end production verification remains outstanding.
- GitHub workflow support exists for public AI wiring and repository consistency checks.

### Most recent AI Liaison repair

The previous public AI Liaison layout fix placed the widget too close to the page bottom. That caused the launcher to compete with the WhatsApp button and could make the icon/button appear misplaced or visually inaccessible.

Commit `105a30d37de804284f04a4952c8ec5b71a34b81e` fixes this by making the layout override authoritative:

- AI Liaison is positioned **above WhatsApp** on desktop and mobile.
- Launcher receives explicit pointer events.
- Panel receives explicit pointer events.
- The launcher icon is explicitly forced visible.
- The minimised lawyer icon is explicitly controlled.
- The open state hides the launcher without disabling the panel.
- Mobile viewport spacing is preserved.
- The panel is anchored above the launcher rather than being rendered beside/under it.

Relevant files:

- `app/communication/public/PublicLeadLiaison.js`
- `app/communication/public/PublicServiceDirectory.js`
- `app/communication/agents/PublicLeadResponseGenerator.js`
- `app/ai/ServiceClassifier.js`
- `app/ai/ServiceIntelligenceEngine.js`
- `app/css/public-ai-liaison.css`
- `app/css/public-ai-liaison-layout-fix.css`

## 2. Public AI Liaison flow

The intended public flow is:

`Website visitor`  
→ `AI Liaison`  
→ `Free 15-minute preliminary consultation`  
→ `Service category`  
→ `Specific service`  
→ `Qualification questions`  
→ `Client/business information`  
→ `Prepared enquiry`  
→ `Account creation`  
→ `Isaacs & Partners professional follow-up`

### Category layer

The service directory is governed by `app/communication/public/PublicServiceDirectory.js` and is used by the public widget and service intelligence layer.

### AI orchestration

`WhatsAppAgent` remains the central conversational orchestrator. It owns service intelligence, intent classification, conversation handling, lead/sales flow, escalation and authority/commercial policy decisions. `PublicLeadResponseGenerator` is a response/presentation layer, not a replacement AI engine.

### Public memory

The anonymous public website currently uses browser/session memory for the public lead conversation. This is deliberately separate from authenticated client records. Server-side persistence of qualified public enquiries remains a pending production integration.

## 3. Repository architecture / file accounting

The repository contains a large application architecture. The following inventory assigns the tracked codebase to its intended responsibility so future work does not create duplicate abstractions.

### Root / public website

| Path / area | Responsibility | Status |
|---|---|---|
| `index.html` | Main public website and public AI bootstrap surface | Active |
| `404.html` | GitHub Pages fallback | Active |
| `CNAME` | Custom-domain configuration | Active |
| `robots.txt` | Search crawler policy | Active |
| `sitemap.xml` | Search indexing map | Active |
| `script.js` | Public-site interaction/bootstrap code | Active |
| `style.css` | Main public-site styling | Active |
| `assets/` | Brand/logo/static assets | Active |
| `images/` | Website imagery and legacy/static image area | Active / review when touched |
| `README.md` | This build ledger | Active |

### `app/ai/`

This is the application AI intelligence layer. It contains the AI engine, orchestration helpers, decision tree, memory, prompt construction, classifiers, parsers, planners, analysis modules and service intelligence. The existing architecture must be extended rather than replaced.

Known core areas include:

- `engine.js`
- `router.js`
- `memory.js`
- `decision-tree.js`
- `document-analyser.js`
- `matter-generator.js`
- `prompt-builder.js`
- `recommendations.js`
- `risk-engine.js`
- `ServiceClassifier.js`
- `ServiceIntelligenceEngine.js`
- `analysis/`
- `classifier/`
- `decision/`
- `memory/`
- `orchestrator/`
- `parser/`
- `planner/`
- `prompts/`
- `skills/`

**Status:** Core architecture exists. Remaining work is authoritative operational data access, production validation, deeper document/form automation and final end-to-end AI orchestration.

### `app/communication/`

Communication and AI interaction boundary.

Important areas include:

- `index.js`
- `agents/`
- `public/`
- communication classifiers/handlers/services
- WhatsApp agent and response-generation layers
- lead/sales/escalation/authority/commercial policy services

Public AI files:

- `app/communication/public/PublicLeadLiaison.js`
- `app/communication/public/PublicServiceDirectory.js`
- `app/communication/agents/PublicLeadResponseGenerator.js`

**Status:** Public website AI experience exists. Authenticated client/staff/Super Admin relay and full WhatsApp/OpenWA production path remain pending.

### `app/auth/`

Authentication and access-control layer.

Known files/components include:

- `LoginController.js`
- `AdminAuthGuard.js`
- `AuthService.js`
- `AuthGuard.js`
- login/register pages
- role and dashboard access integration

**Status:** Authentication foundation exists. Final production security audit, role-by-role testing and complete client approval lifecycle remain outstanding.

### `app/client/`

Authenticated client portal.

Important completed integration:

- `messages.js`
- `messages.html`

The client Messages surface uses the server-side AI Liaison runtime rather than creating a browser-side duplicate AI implementation.

**Status:** Core portal exists. Approval lifecycle, full matter/quote/payment/document orchestration and production WhatsApp notifications still need final end-to-end verification.

### `app/dashboard/`

Dashboard/control-plane layer for authenticated users and administration.

Important areas include:

- `DashboardAccess.js`
- `ControlPlaneRuntime.js`
- `AdminBrandAssetService.js`
- dashboard-specific UI/runtime files
- Super Admin/staff/client dashboard areas

**Status:** Foundation exists. The complete Super Admin command centre, approval UI, AI intervention console, operational read model and final dashboard visual system remain to be completed.

### `app/services/`

Application services/facades for authentication, bookings, consultation, documents, knowledgebase, notifications and other business operations.

Known services include:

- `auth.service.js`
- `booking.service.js`
- `consultation.service.js`
- `document.service.js`
- `knowledgebase.service.js`
- `notification.service.js`
- `AILiaisonRuntimeService.js`

**Status:** Broad service layer exists. Remaining work is integration completion and removal of any unverified mock/fallback behaviour from production paths.

### `app/models/`

Domain/data model layer.

Known core models include:

- `User.js`
- `Company.js`
- `Client.js`
- `Matter.js`
- `Appointment.js`
- `Communication.js`
- `Document.js`
- `Payment.js`
- `Quote.js`
- `Task.js`
- `Note.js`
- `Department.js`
- `TimelineEntry.js`
- additional domain records

`Matter.js` is the aggregate root for matter lifecycle and related case operations.

**Status:** Domain foundation exists. Final orchestration against Supabase and production workflows remains.

### `app/matter/`

Application-level matter operations and factories.

Known files:

- `matter.js`
- `matterFactory.js`

**Status:** Active. Must remain aligned with `app/models/Matter.js`; do not create a second matter aggregate.

### `app/domain/`

Domain primitives, aggregate infrastructure and enums.

Includes:

- `AggregateRoot.js`
- `enums/`

**Status:** Foundation exists.

### `app/database/`

Database abstraction, table definitions, query builders, seeds and database functions.

Areas include:

- `tables/`
- `query/`
- `functions/`
- `seeds/`

Known table modules include clients, companies, matters, users, appointments, documents, invoices, payments, tasks, knowledge and workflows.

**Status:** Architecture exists. Supabase is the production source of truth for current authenticated application data. Final production migration verification and read/write integration must continue.

### `app/repositories/`

Repository/data-access abstractions.

Known examples:

- `ClientRepository.js`
- `DocumentRepository.js`
- additional domain repositories

**Status:** Active architecture. Any new data access should use the existing repository/service boundary instead of direct duplicate storage logic.

### `app/storage/`

Storage adapters and persistence abstractions.

Known files include:

- `StorageFactory.js`
- `MemoryAdapter.js`
- `SessionStorageAdapter.js`
- related adapters

**Status:** Active compatibility/persistence layer.

### `app/core/`

Central application infrastructure.

Known areas include:

- `application.js`
- `auth.js`
- `state.js`
- `state-store.js`
- `events.js`
- `navigation.js`
- security/application security
- storage/event/state infrastructure

`state.js` is intentionally retained as a compatibility facade around the central state store. Do not remove compatibility files merely because another implementation exists.

**Status:** Active foundation.

### `app/shared/`

Shared constants, helpers, logging, notifications, validation and cross-cutting definitions.

Important constants cover roles, permissions, service categories, document types, statuses, workflows, priorities, risk levels and validation rules.

**Status:** Active source of shared business vocabulary.

### `app/config/`

Configuration and route definitions.

The route configuration is consumed by navigation and authentication rather than scattering route strings throughout the application.

**Status:** Active.

### `app/features/`

Feature flags and licensing/feature availability.

Known examples:

- `FeatureFlags.js`
- `Licensing.js`

**Status:** Foundation exists; production feature/licensing enforcement remains part of final hardening.

### `app/search/`

Search/query parsing and execution.

Known files include:

- `SearchQuery.js`
- `SearchEngine.js`
- `SearchParser.js`

**Status:** Active architecture.

### `app/pipeline/`

Application pipeline construction/execution support.

Known file:

- `PipelineBuilder.js`

**Status:** Active foundation.

### `app/workflows/`

Business workflow definitions, including immigration workflows.

Known example:

- `immigration.js`

**Status:** Workflow foundation exists. Remaining work is full end-to-end execution, form generation and external submission orchestration.

### `app/uploads/`

Document upload, validation, OCR and checklist handling.

Known files include:

- `upload.js`
- `ocr.js`
- `validator.js`
- `checklist.js`

**Status:** Foundation exists. Production document storage, OCR reliability, document classification and automated requirements verification remain to be hardened.

### `app/exporters/`

Document/export generation.

Known example:

- `PDFExporter.js`

**Status:** Foundation exists. Invoice/receipt/letter generation and final visual templates need complete production verification.

### `app/metrics/`

Application metrics and telemetry.

Known components include:

- `Metrics.js`
- `Counters.js`
- `Timers.js`
- `Performance.js`
- `Usage.js`

**Status:** Foundation exists; production observability and operational reporting remain to be completed.

### `app/results/`

Typed result/response objects used across the application.

Known results include:

- `AIResult.js`
- `BookingResult.js`
- `ErrorResult.js`
- `ReportResult.js`
- `SearchResult.js`
- `SuccessResult.js`
- `UploadResult.js`
- `ValidationResult.js`
- `WorkflowResult.js`

**Status:** Active shared result architecture.

### `app/exceptions/`

Typed application exceptions such as authorization, validation, repository, storage, document, knowledge, workflow, configuration, network and business-rule failures.

**Status:** Active error boundary architecture.

### `app/js/`

Browser application helpers/adapters.

Known files include:

- `app.js`
- `api.js`
- `theme.js`

**Status:** Active browser layer; must remain coordinated with the central core/services architecture.

### `app/css/`

Application-specific styles.

Important public AI styles:

- `public-ai-liaison.css`
- `public-ai-liaison-layout-fix.css`

**Status:** Active. Public AI layout has just been repaired.

### `app/data/`

Structured application data, including service definitions and other controlled data sources.

**Status:** Active; data should remain governed and version-controlled.

### `app/knowledgebase/`

Immigration/legal/business/HR knowledge resources and controlled service knowledge.

**Status:** Foundation exists. The next major phase is authoritative operational knowledge integration, freshness controls, source provenance and AI read tools.

### `app/templates/`

Document and communication templates.

Known template families include appointment, cover sheet, invoice, power of attorney, receipt and retainer templates.

**Status:** Templates exist; full automated population and final PDF/document verification remain.

### `app/icons/`

Application icon assets/components.

**Status:** Active static/UI resource area.

### `app/booking/` and `app/consultation/`

Booking and consultation user journeys.

**Status:** Foundation exists. Full appointment scheduling, payment/consultation rules and staff calendar/read-model integration remain to be completed.

## 4. Supabase / server-side integration

The repository also contains Supabase configuration and server-side functions/migrations used by the client portal and AI Liaison runtime.

Important areas include:

- `supabase/config.toml`
- `supabase/functions/ai-liaison-runtime/index.ts`
- `supabase/migrations/`

The server runtime is intended to reuse the existing AI architecture and must not become a second independent AI implementation.

### Production boundary

The intended architecture is:

`Browser / WhatsApp` → `AI Liaison runtime` → `WhatsAppAgent / service intelligence / policy` → `Supabase operational data` → `lead / matter / appointment / quote / payment / document workflows`

OpenWA/WhatsApp transport is a separate infrastructure boundary. It should not be hardcoded into the browser AI.

## 5. What is still outstanding

### Priority 1 — finish and validate public AI

- Browser-test the repaired AI Liaison on desktop.
- Browser-test on mobile viewport.
- Verify launcher does not collide with WhatsApp.
- Verify icon is visible.
- Verify launcher opens panel.
- Verify minimise changes to the lawyer icon.
- Verify close removes the panel without breaking launcher.
- Test `Hi`.
- Test category selection.
- Test `CCMA hearring` typo correction.
- Test service selection and service information.
- Test qualification questions.
- Test account CTAs.
- Verify all CTA destinations.

### Priority 2 — persist public enquiries

The anonymous public AI currently has browser memory. Build the secure server-side lead/enquiry persistence path so a qualified visitor can become a real enquiry without exposing private data.

### Priority 3 — client approval lifecycle

Complete and verify:

`New client → PENDING → Super Admin review → APPROVED/SUSPENDED → dashboard access`

The database/RLS rules and Super Admin UI must agree.

### Priority 4 — authenticated AI

Complete the authenticated client/staff/Super Admin AI experience with:

- authoritative client data access
- matter access
- document state
- appointment state
- quote/payment state
- escalation/intervention
- audit logging
- role-based permissions

### Priority 5 — WhatsApp/OpenWA

After application-side AI is stable:

- outbound AI → OpenWA relay
- OpenWA worker/scheduler
- inbound WhatsApp → AI Liaison runtime
- delivery/status handling
- production tunnel/Cloudflare configuration
- retry/failure handling

Do not move this infrastructure ahead of the application-side validation.

### Priority 6 — commercial workflow

Complete the end-to-end commercial state machine:

`Enquiry → Quote → Acceptance → 50% deposit → Matter/file opening → Work → Final 50% where applicable → Submission/closure`

The AI must never claim payment or submission status without authoritative data.

### Priority 7 — documents and immigration automation

Complete:

- requirements engine
- knowledgebase-backed eligibility
- document checklist
- OCR/document analysis
- form population
- cover sheets
- application bundles
- VFS/DHA routing
- appeal workflows
- final submission package validation

### Priority 8 — final production audit

Before declaring the platform production-ready:

- authentication/RLS audit
- authorization audit
- route audit
- asset/path audit
- broken-link audit
- browser console audit
- mobile responsiveness audit
- accessibility audit
- AI hallucination/policy audit
- payment-state audit
- document privacy audit
- Supabase migration/RLS audit
- WhatsApp/OpenWA reliability audit
- performance audit

## 6. Important business rules

The AI must follow these rules:

- The public AI offers a **free 15-minute preliminary consultation**.
- A formal paid professional consultation is separate.
- Standard substantive matters require a quotation.
- Standard matter commercial flow uses a **50% deposit** before the matter/file proceeds, with the remaining 50% due at the applicable completion/submission point.
- Third-party fees are excluded unless explicitly included in an authorised quote.
- AI must not invent prices, quotes, payment confirmations, appointment confirmations or submission confirmations.
- AI must use authoritative application data for operational claims.
- Public anonymous conversations must not expose private client records.

## 7. Architecture rules for future work

1. **Do not create a second AI engine.** Use `WhatsAppAgent` and the existing AI orchestration layers.
2. **Do not create a second browser Supabase authentication system.** Use the existing authentication/core services.
3. **Do not duplicate service directories.** `PublicServiceDirectory.js` and the governed service data remain the navigation source.
4. **Do not bypass repositories/services for application data** unless the architecture explicitly requires it.
5. **Do not delete compatibility facades without proving there are no consumers.**
6. **Do not add secrets to frontend files or GitHub.**
7. **Do not connect OpenWA/Cloudflare infrastructure until the application-side path is validated.**
8. **Do not treat localStorage/sessionStorage as the permanent source of truth for qualified leads.**
9. **Do not call a feature complete until the browser flow has been tested.**
10. Every future implementation should update this README's status ledger.

## 8. Current file/accounting status

This repository contains both completed infrastructure and partially implemented application layers. A file being present does **not** mean its business workflow is production-complete. Conversely, a compatibility or facade file should not be considered redundant simply because a lower-level implementation also exists.

For future changes, use this status model:

- `[DONE]` implemented and integrated
- `[VERIFY]` implemented but browser/integration verification still required
- `[IN PROGRESS]` architecture exists but feature is incomplete
- `[PENDING]` not yet implemented
- `[LEGACY/COMPAT]` retained intentionally for compatibility
- `[REMOVE ONLY AFTER AUDIT]` candidate that must not be deleted casually

### Immediate status

- `[DONE]` Logo canonicalisation
- `[DONE]` Public AI service directory
- `[DONE]` Public AI response layer
- `[DONE]` Public AI launcher/panel architecture
- `[DONE]` Public AI category/service selection
- `[DONE]` Public AI qualification state
- `[DONE]` Public AI local session memory
- `[DONE]` Client Messages AI runtime wiring
- `[DONE]` AI Liaison server runtime foundation
- `[DONE]` Commercial policy foundation
- `[DONE]` Current AI Liaison icon/button/layout repair
- `[VERIFY]` Public AI desktop browser flow
- `[VERIFY]` Public AI mobile browser flow
- `[VERIFY]` End-to-end service selection and qualification
- `[VERIFY]` Client approval lifecycle
- `[IN PROGRESS]` Server-side public lead persistence
- `[IN PROGRESS]` Super Admin approval/command centre
- `[IN PROGRESS]` Authenticated AI operational read model
- `[PENDING]` Full OpenWA inbound/outbound relay
- `[PENDING]` Cloudflare production tunnel
- `[PENDING]` Full commercial/payment orchestration
- `[PENDING]` Final immigration form automation/submission bundle
- `[PENDING]` Final security and production audit

## 9. Change discipline

When adding or modifying a file:

1. Check this README first.
2. Identify the existing owner of the responsibility.
3. Reuse existing services/classes where possible.
4. Make the smallest integrated change.
5. Test the affected browser flow.
6. Update this README if architecture/status changes.
7. Commit only the files required for the completed change.

**Current next action:** browser validation of the repaired Public AI Liaison, followed by server-side persistence of qualified public enquiries. 
