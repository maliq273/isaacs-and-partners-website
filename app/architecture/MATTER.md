# Matter Architecture

## 1. Matter Definition

A Matter represents a professional engagement handled by Isaacs & Partners.

A matter must have sufficient information to identify:

- client;
- service;
- department;
- matter type;
- status;
- priority;
- assigned handler;
- required documents;
- tasks;
- timeline.

---

# 2. Matter Lifecycle

Typical lifecycle:

NEW
↓
INTAKE
↓
ANALYSIS
↓
DOCUMENT COLLECTION
↓
PREPARATION
↓
REVIEW
↓
SUBMISSION
↓
AWAITING OUTCOME
↓
COMPLETED

Alternative terminal states:

- REJECTED;
- WITHDRAWN;
- CANCELLED;
- ARCHIVED.

Not every matter must follow the exact same workflow.

---

# 3. Matter Aggregate

Matter may contain or reference:

- Client;
- Documents;
- Tasks;
- Notes;
- Appointments;
- Communications;
- Timeline entries;
- Workflows;
- AI analyses;
- invoices;
- payments;
- bundle information.

---

# 4. Matter Ownership

The Matter Manager coordinates application-level operations.

MatterEngine performs specialised processing.

MatterPolicy controls access.

MatterRepository persists matter data.

MatterValidation verifies required data.

MatterTimeline records significant chronological events.

---

# 5. Document Requirements

Matter requirements should be derived from:

- service;
- matter type;
- jurisdiction;
- applicant/client characteristics;
- applicable rules;
- knowledgebase;
- workflow.

AI may assist with matching uploaded documents to requirements.

The RequirementEngine remains responsible for deterministic requirements.

---

# 6. Status Changes

Important status changes should:

1. validate the transition;
2. update the matter;
3. create timeline information;
4. emit a domain event;
5. create an audit entry;
6. trigger relevant workflow actions.

---

# 7. Matter Security

Matter access must respect:

- user role;
- department;
- assignment;
- visibility;
- client confidentiality;
- document permissions.

---

# 8. Closure

A matter should only be closed when:

- required work is complete;
- outstanding tasks are resolved or intentionally carried forward;
- required documents are accounted for;
- final communication has been recorded;
- financial status is addressed where applicable;
- appropriate audit information exists.

