# Roadmap

## 1. Objective

The objective is to complete the Isaacs and Partners application as a
production-ready legal, immigration, HR, labour, business and document
management platform.

Development must continue incrementally without unnecessarily restructuring
the existing application.

---

# Phase 1 — Core Architecture

Status: Completed / Established

Core layers established:

- domain;
- models;
- repositories;
- services;
- managers;
- engines;
- storage;
- validators;
- policies;
- serializers;
- mappers;
- results;
- exceptions;
- events.

---

# Phase 2 — Persistence

Objectives:

- complete repository implementations;
- complete SQLite persistence;
- establish migration handling;
- implement storage abstraction;
- implement backup and restore;
- validate transaction behaviour;
- support local-first operation.

Key areas:

```text
app/storage/
app/repositories/
app/models/
Phase 3 — Authentication and Security

Objectives:

complete authentication;
session management;
role management;
permissions;
security policies;
audit logging;
session timeout;
secure document access.

Key areas:

AuthenticationService
SecurityManager
SecurityPolicy
SecurityValidator
AuditEvents
Phase 4 — Client and Matter Management

Objectives:

client creation;
client search;
client profiles;
matter creation;
matter assignment;
matter status;
matter timeline;
notes;
tasks;
communications;
document association.

Matter lifecycle:

Intake
 ↓
Consultation
 ↓
Eligibility
 ↓
Document Collection
 ↓
Preparation
 ↓
Review
 ↓
Submission
 ↓
Processing
 ↓
Outcome
 ↓
Closure
Phase 5 — Consultation Engine

Objectives:

consultation intake;
structured fact capture;
service classification;
eligibility screening;
risk identification;
consultation notes;
matter generation.

The AI should assist the consultation process without replacing professional
review.

Phase 6 — Knowledgebase

Objectives:

maintain legal knowledge domains;
maintain legislation;
maintain regulations;
maintain case law;
maintain authoritative guidance;
maintain articles and handbooks;
maintain internal case studies;
maintain source metadata;
maintain version metadata;
implement indexing;
implement knowledge search;
implement source validation.

Primary domains:

Immigration
Labour
CCMA
HR
Contracts
Business
Mediation
Notary

The knowledgebase must distinguish authoritative law from secondary material
and internal case studies.

Phase 7 — Immigration Intelligence

Objectives:

immigration matter classification;
visa requirement engine;
document requirement engine;
eligibility engine;
document checklist;
VFS/DHA bundle preparation;
missing-document detection;
application bundle generation;
applicant notifications;
document matching;
printable bundle generation.

Workflow:

Applicant
 ↓
Consultation
 ↓
Eligibility
 ↓
Matter
 ↓
Required Documents
 ↓
Uploads
 ↓
Verification
 ↓
Bundle
 ↓
Quality Control
 ↓
Print / Submit
Phase 8 — Legal and Labour Workflows

Objectives:

HR workflows;
disciplinary workflows;
employment contracts;
labour disputes;
CCMA workflows;
mediation;
appeals;
legal drafting;
notarial workflows.

Each workflow should be represented as structured application logic.

Phase 9 — Document Intelligence

Objectives:

secure uploads;
OCR;
document classification;
document extraction;
document verification;
expiry detection;
document matching;
automated checklists;
document versioning;
bundle generation.

Pipeline:

Upload
 ↓
Validate
 ↓
OCR
 ↓
Extract
 ↓
Classify
 ↓
Match
 ↓
Verify
 ↓
Bundle
Phase 10 — AI Engine

Objectives:

consultation intelligence;
matter classification;
knowledge retrieval;
document analysis;
eligibility analysis;
risk analysis;
recommendation engine;
AI-assisted drafting;
explainable results;
source attribution;
human review controls.

AI must never fabricate legal authorities.

Phase 11 — Workflow Automation

Objectives:

workflow execution;
task generation;
reminders;
deadlines;
follow-ups;
notifications;
escalation;
automated document requests;
status transitions.
Phase 12 — Communications

Objectives:

email;
WhatsApp;
internal notifications;
client portal notifications;
appointment reminders;
document outstanding notifications;
matter status notifications.

External delivery failures should be retryable.

Phase 13 — Billing and Financial Management

Objectives:

quotes;
invoices;
deposits;
retainers;
payments;
receipts;
payment tracking;
outstanding balances;
reporting;
banking references.

Financial documents should use the central business information configured
for Isaacs and Partners.

The application must distinguish VAT-registered and non-VAT-registered
business treatment according to the current business configuration.

Phase 14 — Reporting

Objectives:

matter reports;
client reports;
document reports;
workflow reports;
financial reports;
staff activity;
performance;
communication logs;
operational dashboards.

Exports:

PDF
Excel
CSV
Phase 15 — Applicant / Client Portal

Objectives:

secure client login;
matter dashboard;
outstanding documents;
upload documents;
appointment information;
communication history;
matter status;
notifications;
downloadable documents.

Immigration applicants should be able to see exactly what remains
outstanding.

Phase 16 — Automation and Background Jobs

Objectives:

backups;
OCR;
notifications;
reminders;
reporting;
synchronisation;
bundle generation;
cleanup;
AI processing.

Jobs must be safe to retry.

Phase 17 — Search

Objectives:

global search;
client search;
matter search;
document search;
knowledge search;
workflow search;
search history;
suggestions;
ranking.
Phase 18 — Compliance and Audit

Objectives:

audit trail;
user activity;
login/logout records;
document access;
matter changes;
financial changes;
workflow changes;
security events.

The audit trail should be append-oriented and protected from ordinary user
modification.

Phase 19 — Testing

Required testing areas:

Unit Tests
Integration Tests
Repository Tests
Service Tests
Workflow Tests
Knowledgebase Tests
AI Tests
Document Tests
Security Tests
Upload Tests

Existing test areas include:

ai.test.js
knowledgebase.test.js
workflow.test.js
Phase 20 — Production Hardening

Before production release:

validate all imports;
remove dead code;
remove duplicated services;
validate all repository contracts;
validate storage fallbacks;
test authentication;
test authorisation;
test backups;
test restore;
test document security;
test AI failure handling;
test external-service failure handling;
validate generated PDFs;
validate invoice/receipt output;
validate bundle generation;
validate audit logging.
Phase 21 — Deployment

Production deployment should include:

Build
 ↓
Automated Tests
 ↓
Validation
 ↓
Database Migration
 ↓
Backup
 ↓
Deployment
 ↓
Smoke Tests
 ↓
Monitoring

No production deployment should proceed if a migration could result in
irreversible data loss without a verified backup.

Development Rule

The application should be completed folder-by-folder.

For each folder:

preserve the existing folder structure;
inspect dependencies;
complete each file;
connect it to existing modules;
avoid rewriting already completed files;
maintain compatible imports and exports;
identify missing dependencies rather than silently inventing replacements;
test integration before moving to the next folder.

The objective is a single coherent production codebase rather than isolated
code snippets.
