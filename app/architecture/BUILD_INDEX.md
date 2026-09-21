# Build Index

## Purpose

This file tracks the architectural implementation of the application.

It is the navigation index for the repository.

---

# 1. Core

- core/application.js
- core/bootstrap.js
- core/events.js
- core/router.js
- core/state.js
- core/storage.js

---

# 2. Domain

- domain/AggregateRoot.js
- domain/BaseModel.js
- domain/DomainEvent.js
- domain/Entity.js
- domain/Repository.js
- domain/ValueObject.js

---

# 3. Models

- models/Appointment.js
- models/Client.js
- models/Communication.js
- models/Company.js
- models/Department.js
- models/Document.js
- models/Invoice.js
- models/Matter.js
- models/Note.js
- models/Payment.js
- models/Quote.js
- models/Task.js
- models/TimelineEntry.js
- models/User.js
- models/Workflow.js

---

# 4. Matter

- matter/matter.js
- matter/matterFactory.js
- matter/matterManager.js
- matter/matterStatus.js
- matter/matterTimeline.js
- matter/matterValidation.js

---

# 5. Knowledgebase

Domains:

- business.json
- ccma.json
- contracts.json
- hr.json
- immigration.json
- labour.json
- mediation.json
- notary.json

Engine:

- DocumentEngine.js
- KnowledgeEngine.js
- KnowledgeLoader.js
- KnowledgeSearch.js
- RequirementEngine.js
- RuleEngine.js

Loader:

- KnowledgeCache.js
- KnowledgeIndexer.js
- KnowledgeLoader.js
- KnowledgeValidator.js

---

# 6. AI

Analysis:

- CaseAnalysis.js
- CompletenessAnalysis.js
- ComplianceAnalysis.js
- DocumentAnalysis.js
- EligibilityAnalysis.js
- ImageAnalysis.js
- OCRAnalysis.js
- QualityAnalysis.js
- RecommendationAnalysis.js
- RiskAnalysis.js
- SummaryAnalysis.js

Classifier:

- ComplexityClassifier.js
- DepartmentClassifier.js

Other AI components include:

- engine.js
- router.js
- memory.js
- prompt-builder.js
- recommendations.js
- risk-engine.js
- document-analyser.js
- decision-tree.js
- matter-generator.js

---

# 7. Builders

- BundleBuilder.js
- ChecklistBuilder.js
- DocumentBuilder.js
- MatterBuilder.js
- PDFBuilder.js
- PromptBuilder.js
- ReportBuilder.js
- WorkflowBuilder.js

---

# 8. Booking

- booking.js
- calendar.js
- confirmation.js
- index.html

---

# 9. Audit

- AuditEntry.js
- AuditExporter.js
- AuditLogger.js
- AuditManager.js
- AuditQuery.js

---

# 10. Storage

- BackupManager.js
- Database.js
- EncryptionProvider.js
- IndexedDBAdapter.js
- LocalStorageAdapter.js
- MemoryAdapter.js
- MigrationManager.js
- RestoreManager.js
- SQLiteAdapter.js
- SessionStorageAdapter.js
- StorageFactory.js
- StorageProvider.js
- StorageTransaction.js
- SupabaseAdapter.js

---

# 11. Repositories

- BaseRepository.js
- BookingRepository.js
- ClientRepository.js
- DocumentRepository.js
- KnowledgeRepository.js
- MatterRepository.js

---

# 12. Managers

- AIManager.js
- BookingManager.js
- ClientManager.js
- KnowledgeManager.js
- MatterManager.js
- NotificationManager.js
- SecurityManager.js
- UploadManager.js
- WorkflowManager.js

---

# 13. Engines

- AIEngine.js
- AutomationEngine.js
- BookingEngine.js
- BundleEngine.js
- ComplianceEngine.js
- DocumentEngine.js
- EligibilityEngine.js
- KnowledgeEngine.js
- MatterEngine.js
- NotificationEngine.js
- PortalEngine.js
- ReportingEngine.js
- RiskEngine.js
- TimelineEngine.js
- WorkflowEngine.js

---

# 14. Events

- AIEvents.js
- AuditEvents.js
- DomainEvents.js
- EventDispatcher.js
- EventHandler.js
- EventSubscriber.js
- IntegrationEvents.js
- NotificationEvents.js
- SystemEvents.js
- WorkflowEvents.js

---

# 15. Policies

- BookingPolicy.js
- ClientPolicy.js
- DocumentPolicy.js
- MatterPolicy.js
- SecurityPolicy.js
- WorkflowPolicy.js

---

# 16. Queries

- BookingQuery.js
- ClientQuery.js
- DashboardQuery.js
- DocumentQuery.js
- KnowledgeQuery.js
- MatterQuery.js
- ReportQuery.js
- WorkflowQuery.js

---

# 17. Serializers

- ClientSerializer.js
- DocumentSerializer.js
- MatterSerializer.js
- ReportSerializer.js
- WorkflowSerializer.js

---

# 18. Search

- SearchEngine.js
- SearchHistory.js
- SearchIndex.js
- SearchParser.js
- SearchQuery.js
- SearchRanking.js
- SearchResult.js
- SearchSuggestion.js

---

# 19. Schedulers

- ArchiveScheduler.js
- DailyScheduler.js
- FollowUpScheduler.js
- MonthlyScheduler.js
- ReminderScheduler.js
- WeeklyScheduler.js

---

# 20. Jobs

- AIJob.js
- BackupJob.js
- BundleJob.js
- CleanupJob.js
- NotificationJob.js
- OCRJob.js
- ReminderJob.js
- ReportingJob.js
- SyncJob.js

---

# 21. Results

- AIResult.js
- BookingResult.js
- ErrorResult.js
- ReportResult.js
- Result.js
- SearchResult.js
- SuccessResult.js
- UploadResult.js
- ValidationResult.js
- WorkflowResult.js

---

# 22. Commands

- ApproveMatter.js
- AssignMatter.js
- BookAppointment.js
- CreateMatter.js
- DeleteMatter.js
- GenerateBundle.js
- RejectMatter.js
- SendNotification.js
- SubmitApplication.js
- UpdateMatter.js
- UploadDocument.js

---

# 23. Database / Supabase

Production persistence is Supabase-backed.

Repository database source of truth:

- supabase/migrations/
- supabase/functions/
- app/services/
- app/client/
- app/dashboard/

The former `app/database/` shadow SQL/table/model layer has been removed because it was not connected to the production Supabase architecture.

---

# 24. Document / Invoice Generation

Production document generation is handled by the active controllers/services and Supabase-backed data.

The former `app/templates/` runtime template collection has been removed where it was not referenced by production code.

---

# 25. Data

- visa-types.json
- countries.json
- departments.json
- languages.json
- occupations.json
- services.json

---

# 26. Frontend

Dashboard:

- ai.html
- analytics.html
- clients.html
- index.html
- matters.html
- reports.html
- staff.html

Client:

- dashboard.html
- documents.html
- login.html
- messages.html
- settings.html
- timeline.html

Consultation:

- index.html
- questions.js
- review.js
- steps.js
- summary.js
- wizard.js

---

# 27. Tests

- ai.test.js
- knowledgebase.test.js
- workflow.test.js

---

# 28. Build Dependency Rule

When implementing a new feature, check this index before adding another abstraction.

Do not create a duplicate component where an existing component already owns the responsibility.

---

# 29. Completion Rule

A folder is considered implemented only when:

- source files exist;
- dependencies are connected;
- validation exists;
- persistence is connected where required;
- security is addressed;
- audit is addressed where applicable;
- tests exist where appropriate;
- documentation reflects the implementation.

---

# 30. Architectural Principle

The repository is being built as one integrated system.

A file should never be considered in isolation when it participates in a domain workflow.
