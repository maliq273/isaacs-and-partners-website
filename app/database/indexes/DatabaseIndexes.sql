-- Master index loader.
-- Execute after all required tables have been created.

.read ClientIndexes.sql
.read MatterIndexes.sql
.read DocumentIndexes.sql
.read AppointmentIndexes.sql
.read WorkflowIndexes.sql
.read TaskIndexes.sql
.read NoteIndexes.sql
.read UserIndexes.sql
.read InvoiceIndexes.sql
.read PaymentIndexes.sql
.read KnowledgeIndexes.sql
.read CompanyIndexes.sql
.read AIIndexes.sql
.read AuditIndexes.sql
