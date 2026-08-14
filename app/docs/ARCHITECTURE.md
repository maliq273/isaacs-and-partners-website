# Architecture

## 1. System Overview

Isaacs and Partners uses a layered application architecture designed around
domain models, services, repositories, engines and storage adapters.

```text
                         USER INTERFACE
                               │
                               ▼
                         APPLICATION JS
                               │
                               ▼
                    ┌─────────────────────┐
                    │      SERVICES       │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      MANAGERS       │
                    └─────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
             ENGINES       WORKFLOWS         AI
                │              │              │
                └──────────────┼──────────────┘
                               ▼
                         DOMAIN LAYER
                               │
                               ▼
                         REPOSITORIES
                               │
                               ▼
                           STORAGE
2. Domain Layer

The domain layer defines core business concepts.

app/domain/

It contains:

Entity;
ValueObject;
AggregateRoot;
DomainEvent;
BaseModel;
Repository;
domain enums.

The domain layer should remain independent of UI concerns.

3. Models

Application models represent important business entities.

app/models/

Examples:

Client;
Matter;
Appointment;
Document;
Invoice;
Payment;
Quote;
User;
Task;
Note;
Communication;
TimelineEntry;
Workflow.

Models should contain business state and model-level behaviour where
appropriate.

4. Repositories

Repositories provide persistence boundaries.

app/repositories/

Current repository architecture:

BaseRepository
├── BookingRepository
├── ClientRepository
├── DocumentRepository
├── KnowledgeRepository
└── MatterRepository

Repositories must not contain UI logic.

5. Storage

Storage adapters isolate persistence technologies.

app/storage/

Supported architecture includes:

StorageProvider
├── SQLiteAdapter
├── IndexedDBAdapter
├── LocalStorageAdapter
├── SessionStorageAdapter
├── MemoryAdapter
└── SupabaseAdapter

SQLite/local storage remains suitable for local-first operation.

External synchronization should occur through explicit integration logic.

6. Services

Services provide application-level operations.

app/services/

They coordinate:

Validation
   ↓
Authorisation
   ↓
Business Logic
   ↓
Repository
   ↓
Result

Services should not directly manipulate UI elements.

7. Managers

Managers coordinate complex application operations.

app/managers/

Examples:

AIManager;
BookingManager;
ClientManager;
KnowledgeManager;
MatterManager;
NotificationManager;
SecurityManager;
UploadManager;
WorkflowManager.

Managers may coordinate multiple services and engines.

8. Engines

Engines implement specialised processing.

app/engines/

Current engines include:

AIEngine
AutomationEngine
BookingEngine
BundleEngine
ComplianceEngine
DocumentEngine
EligibilityEngine
KnowledgeEngine
MatterEngine
NotificationEngine
PortalEngine
ReportingEngine
RiskEngine
TimelineEngine
WorkflowEngine

Engines should expose deterministic processing wherever practical.

9. Knowledgebase

The knowledgebase is located at:

app/knowledgebase/

Domains:

business.json
ccma.json
contracts.json
hr.json
immigration.json
labour.json
mediation.json
notary.json

Knowledge processing is supported by:

engine/
loader/

The knowledgebase must maintain source and version metadata.

10. Workflows

Workflow definitions are stored under:

app/workflows/

Current domains:

appeals.js
business.js
hr.js
immigration.js
legal.js

Workflows should define structured steps rather than embedding workflow
logic throughout the UI.

11. Events

The event system is located at:

app/events/

It supports:

domain events;
workflow events;
audit events;
notification events;
integration events;
system events;
AI events.

Events allow components to communicate without tightly coupling every module.

12. Jobs

Background operations are located under:

app/jobs/

Examples:

AIJob;
BackupJob;
BundleJob;
CleanupJob;
NotificationJob;
OCRJob;
ReminderJob;
ReportingJob;
SyncJob.

Jobs should be retryable where appropriate.

13. Upload Architecture

Uploads are handled through:

app/uploads/

The upload pipeline is:

Upload
 ↓
Validation
 ↓
Security Validation
 ↓
Storage
 ↓
OCR / Processing
 ↓
Classification
 ↓
Matter Association
 ↓
Verification
14. Search

Search functionality is isolated under:

app/search/

Components include:

SearchEngine
SearchHistory
SearchIndex
SearchParser
SearchQuery
SearchRanking
SearchResult
SearchSuggestion

Search should operate against indexed application data rather than forcing
every screen to implement its own search logic.

15. Pipeline

The pipeline layer provides controlled execution of processing stages.

Pipeline
PipelineBuilder
PipelineContext
PipelineExecutor
PipelineStage

Typical pipeline:

Input
 ↓
Validation
 ↓
Authorisation
 ↓
Processing
 ↓
Persistence
 ↓
Events
 ↓
Result
16. Policies

Policies control authorisation and business access.

app/policies/

Policies should answer whether an operation is permitted.

They should not perform the operation themselves.

17. Validators

Validators enforce input and business constraints.

app/validators/

Validation occurs at multiple boundaries:

UI
 ↓
Service
 ↓
Repository
 ↓
Storage

The server/storage boundary must never rely solely on UI validation.

18. Serializers and Mappers

Serializers control external representation.

Mappers convert between:

Persistence
      ↕
Domain
      ↕
Application
      ↕
API/UI

This prevents storage-specific structures from leaking throughout the
application.

19. Results

Operations should return structured result objects.

app/results/

This avoids inconsistent return formats across services.

20. Exceptions

Application exceptions are centralised under:

app/exceptions/

This allows the application to distinguish:

validation failures;
authentication failures;
authorisation failures;
repository failures;
storage failures;
workflow failures;
document failures;
AI failures;
knowledge failures.
21. Security Boundary

Security should be enforced in layers.

Authentication
      ↓
Authorisation
      ↓
Policy
      ↓
Validation
      ↓
Service
      ↓
Repository
      ↓
Storage

No single UI control should be treated as a security boundary.

22. Local-First Principle

The system should continue operating where possible when external services are
unavailable.

External services include:

Supabase;
AI providers;
WhatsApp;
email;
remote APIs.

The application should queue or defer non-critical external operations rather
than corrupting local application state.

23. Source of Truth

Each category of information should have one authoritative source.

Transactional Data
        ↓
Domain / Repository

Legal Knowledge
        ↓
Knowledgebase

Application Configuration
        ↓
Constants / Configuration

Authentication
        ↓
Authentication Layer

External Integration State
        ↓
Integration Adapter

AI output is not automatically authoritative.

24. Production Rule

Existing modules must be reused wherever possible.

Do not introduce duplicate implementations merely to satisfy a new feature.

When functionality already exists in:

services/
repositories/
engines/
managers/
models/
domain/
storage/

new modules should integrate with the existing implementation instead of
creating parallel logic.

25. Folder Structure Principle

The existing application structure is intentionally preserved.

Future additions should fit the existing architecture rather than requiring
a broad restructuring of the project.

26. Architectural Goal

The final system should provide:

predictable business workflows;
strong validation;
auditable operations;
secure document handling;
structured legal knowledge;
AI-assisted analysis;
local-first resilience;
controlled external integrations;
maintainable domain models;
reusable production services.
