# Isaacs & Partners Application Architecture

## 1. Purpose

This directory contains the architectural source of truth for the Isaacs & Partners application.

The documentation governs:

- application structure;
- domain boundaries;
- AI behaviour;
- knowledgebase architecture;
- matter lifecycle;
- workflows;
- coding standards;
- database interaction;
- storage;
- security;
- audit;
- document processing;
- bundle generation;
- reporting;
- roadmap and build order.

These documents must remain aligned with the actual implementation.

---

# 2. Core Principle

The application is designed as a modular legal, immigration, HR, labour, business-compliance and document-management platform.

The system must favour:

1. correctness;
2. traceability;
3. security;
4. deterministic business rules;
5. source-backed AI;
6. auditability;
7. maintainability;
8. separation of concerns.

AI must assist the system but must not silently replace deterministic business rules.

---

# 3. Primary Domains

The application contains the following major domains:

- Client Management
- Matter Management
- Appointment / Booking Management
- Document Management
- Knowledge Management
- Immigration
- HR
- Labour / Industrial Relations
- CCMA
- Mediation
- Notarial Services
- Business Compliance
- Contracts
- AI Analysis
- Eligibility
- Risk
- Compliance
- Workflows
- Reporting
- Notifications
- Audit
- Storage
- Security
- Billing / Invoicing
- Portal Management

---

# 4. Architectural Layers

The preferred dependency direction is:

UI
↓
Commands / Controllers
↓
Managers / Services
↓
Engines
↓
Domain / Policies / Validators
↓
Repositories
↓
Storage / Database

Cross-cutting systems:

- Audit
- Logging
- Notifications
- Security
- Configuration
- Metrics
- Events

AI flow:

Matter
↓
Knowledgebase
↓
Requirement Engine
↓
AI Prompt Construction
↓
AI Engine
↓
Analysis
↓
Risk / Compliance / Eligibility
↓
Recommendation
↓
Human review where required

---

# 5. Architectural Rules

## Rule 1 — Do not bypass domain boundaries

UI code must not directly manipulate database tables.

## Rule 2 — Do not bypass repositories

Application code should use repositories rather than embedding persistence logic in unrelated classes.

## Rule 3 — AI does not become the legal authority

AI output must be treated as analysis or recommendation unless a deterministic rule or authorised human decision establishes the final state.

## Rule 4 — Important actions are auditable

Creation, modification, deletion, submission, approval, rejection, access and security-sensitive operations should produce audit events.

## Rule 5 — Documents are evidence

Uploaded documents must retain metadata, provenance, status, version information and relationships to the relevant matter/client.

## Rule 6 — Knowledge must be source-backed

Legal knowledge must maintain:

- source;
- jurisdiction;
- effective date;
- version;
- authority level;
- citation;
- status;
- verification information.

## Rule 7 — No silent destructive operations

Deletion, replacement, archival or irreversible changes must be explicitly controlled.

---

# 6. Source of Truth

Where multiple systems contain the same information:

- Domain models define business structure.
- Database schemas define persistence structure.
- Knowledgebase defines legal/reference knowledge.
- Configuration defines environment/application settings.
- Policies define permissions and business constraints.
- Audit defines historical evidence.

No duplicated representation should silently become an independent source of truth.

---

# 7. Security

The application handles confidential client and legal information.

Security must therefore cover:

- authentication;
- authorisation;
- session management;
- access control;
- document permissions;
- encryption;
- secure storage;
- audit logging;
- data minimisation;
- secure exports;
- backup security;
- API security.

---

# 8. Legal Information Disclaimer

The knowledgebase is an internal decision-support and research system.

It does not automatically establish that a legal proposition is current or applicable.

Where legal accuracy is material, the system should identify:

- jurisdiction;
- legislation;
- regulations;
- case authority;
- effective date;
- source;
- confidence;
- whether human verification is required.

---

# 9. Documentation Rule

Whenever a major architectural decision changes:

1. implementation must be updated;
2. affected architecture documentation must be updated;
3. BUILD_INDEX.md must be updated;
4. tests must be updated where applicable.
