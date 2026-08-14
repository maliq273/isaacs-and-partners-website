# System Architecture

## 1. System Overview

Isaacs & Partners is a modular case-management and professional-services platform.

The application coordinates:

- clients;
- matters;
- documents;
- appointments;
- workflows;
- knowledge;
- AI;
- compliance;
- billing;
- reporting;
- communications;
- audit;
- storage.

---

# 2. Core Object Relationship

Client
|
+-- Matters
|     |
|     +-- Documents
|     +-- Tasks
|     +-- Notes
|     +-- Appointments
|     +-- Communications
|     +-- Timeline
|     +-- Workflows
|     +-- AI Analysis
|
+-- Communications
|
+-- Documents
|
+-- Appointments

---

# 3. Matter-Centric Architecture

The Matter is the principal operational aggregate.

A matter represents a defined professional engagement.

Examples:

- work visa application;
- permanent residence application;
- CCMA matter;
- disciplinary hearing;
- employment contract matter;
- company registration;
- contract drafting;
- mediation;
- appeal;
- DHA representation.

Matter-related activity should normally be linked to a Matter ID.

---

# 4. Application Layers

## Presentation

Responsible for:

- HTML;
- UI;
- forms;
- dashboards;
- client portal;
- consultation wizard.

## Application

Responsible for:

- commands;
- managers;
- services;
- orchestration.

## Domain

Responsible for:

- entities;
- aggregates;
- value objects;
- domain events;
- domain rules.

## Engine

Responsible for specialised processing.

Examples:

- AIEngine;
- MatterEngine;
- BookingEngine;
- BundleEngine;
- ComplianceEngine;
- EligibilityEngine;
- KnowledgeEngine;
- WorkflowEngine.

## Persistence

Responsible for:

- repositories;
- database;
- storage;
- transactions;
- migrations.

## Infrastructure

Responsible for:

- APIs;
- Supabase;
- SQLite;
- IndexedDB;
- LocalStorage;
- backups;
- encryption.

---

# 5. Cross-Cutting Concerns

The following systems may operate across multiple domains:

- audit;
- logging;
- metrics;
- notifications;
- security;
- events;
- caching;
- configuration.

---

# 6. Event Flow

Domain event:

    Entity
       ↓
    Domain Event
       ↓
    Event Dispatcher
       ↓
    Event Handlers
       ↓
    Audit / Notification / Workflow / Metrics

---

# 7. Transaction Principle

Operations that modify multiple related records should use a transaction or UnitOfWork.

Example:

Matter creation may involve:

- matter;
- timeline;
- tasks;
- documents;
- workflow;
- audit event.

These should not leave the system partially updated.

---

# 8. Storage Strategy

The application supports multiple storage implementations.

Primary abstractions include:

- StorageProvider;
- StorageTransaction;
- SQLiteAdapter;
- SupabaseAdapter;
- IndexedDBAdapter;
- LocalStorageAdapter;
- SessionStorageAdapter;
- MemoryAdapter.

Business logic must not depend directly on one storage implementation.
