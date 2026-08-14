# API

## 1. Purpose

This document defines the application-level API conventions used by Isaacs
and Partners.

The application is designed to support both local-first operation and
controlled external integrations.

---

## 2. Architecture

```text
UI
 │
 ▼
Services
 │
 ▼
Managers / Engines
 │
 ▼
Repositories
 │
 ▼
Storage

External integrations are isolated behind service or adapter boundaries.

3. API Principles

All API operations should:

validate input;
authenticate the user where required;
authorise the requested operation;
return predictable results;
handle failures consistently;
avoid leaking sensitive information;
produce audit information where appropriate.
4. Result Contract

Application operations should preferably return one of the result classes in:

app/results/

Examples:

SuccessResult
ErrorResult
ValidationResult
AIResult
BookingResult
UploadResult
WorkflowResult
ReportResult
SearchResult

A successful operation should provide enough information for the caller to
continue without having to inspect internal implementation details.

5. Authentication

Authentication is handled by:

app/services/AuthenticationService.js
app/services/auth.service.js

Authentication responsibilities include:

login;
logout;
session handling;
identity resolution;
authentication state;
password/security operations where implemented;
session expiry.

Authentication must occur before protected operations are executed.

6. Authorisation

Authentication determines:

Who is the user?

Authorisation determines:

What may the user do?

Authorisation must use the application's policies and permissions.

Relevant components include:

app/policies/
app/shared/constants/Permissions.js
app/shared/constants/Roles.js
app/exceptions/AuthorizationException.js
7. Client Operations

Client operations are handled by:

ClientService
ClientRepository
ClientValidator
ClientPolicy
ClientSerializer
ClientMapper

Typical operations:

Create Client
Get Client
Update Client
Search Clients
Archive Client
Restore Client

Client data must be validated before persistence.

8. Matter Operations

Matter operations are handled through:

MatterService
MatterManager
MatterRepository
MatterValidator
MatterPolicy
MatterSerializer
MatterMapper
MatterEngine

Typical operations:

Create Matter
Get Matter
Update Matter
Assign Matter
Change Status
Add Note
Add Task
Add Timeline Entry
Attach Document
Close Matter
Archive Matter

Matter state transitions should be validated against the application's
workflow and domain rules.

9. Booking Operations

Booking operations are handled by:

BookingService
BookingRepository
BookingManager
BookingEngine
BookingValidator
BookingPolicy

Typical operations:

Create Booking
Check Availability
Confirm Booking
Reschedule Booking
Cancel Booking
Complete Booking
Mark No-Show

Double-booking prevention must occur at the repository/service boundary and
not only in the UI.

10. Document Operations

Document operations are handled by:

DocumentService
DocumentRepository
DocumentValidator
DocumentEngine
UploadManager
OCRJob
BundleEngine

Typical operations:

Upload Document
Validate Document
Classify Document
Extract Text
Verify Document
Reject Document
Archive Document
Generate Bundle

File uploads must never be trusted solely because the client supplied a
valid filename or MIME type.

11. Knowledge Operations

Knowledge operations are handled by:

KnowledgeService
KnowledgeEngine
KnowledgeLoader
KnowledgeSearch
KnowledgeIndexer
KnowledgeValidator

Typical operations:

Search Knowledge
Load Knowledge
Index Knowledge
Validate Knowledge
Retrieve Source
Retrieve Version

Knowledge records should contain source and version information where
available.

12. Workflow Operations

Workflow operations are handled by:

WorkflowService
WorkflowManager
WorkflowEngine
WorkflowValidator
WorkflowPolicy

Typical operations:

Create Workflow
Start Workflow
Advance Workflow
Pause Workflow
Resume Workflow
Complete Workflow
Cancel Workflow

Workflows should remain deterministic where possible.

13. Notifications

Notification operations are handled by:

NotificationService
NotificationManager
NotificationEngine
NotificationJob

Notification channels may include:

application notifications;
email;
WhatsApp;
other approved integrations.

External delivery failures should not corrupt the underlying matter.

14. Reporting

Reporting operations use:

ReportingService
ReportingEngine
ReportQuery
ReportSerializer
ReportExporter

Reports should be generated from authoritative application data.

AI-generated values must not silently replace transactional records.

15. Error Handling

Errors should map to application exceptions:

ApplicationException
AuthenticationException
AuthorizationException
ValidationException
DocumentException
KnowledgeException
RepositoryException
StorageException
WorkflowException
NetworkException

The UI should receive a safe user-facing message.

Internal technical details should be logged rather than exposed.

16. Logging

Operational logging is handled through:

app/shared/logger.js

Logs should contain sufficient information to diagnose failures without
unnecessarily exposing confidential client information.

17. API Security

All external API boundaries must validate:

authentication;
authorisation;
payload structure;
content type;
file type;
size limits;
identifiers;
permissions;
expected state.

Never trust client-side validation alone.

18. Backward Compatibility

Existing services, repositories, models and managers must be reused where
possible.

New API functionality should not require unnecessary rewrites of existing
production modules.

Changes should preserve established folder structure and module contracts.
