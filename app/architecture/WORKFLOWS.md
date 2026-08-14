# Workflow Architecture

## 1. Purpose

Workflows coordinate repeatable business processes.

Examples:

- new client intake;
- immigration application;
- document collection;
- visa appeal;
- CCMA matter;
- HR disciplinary process;
- appointment reminders;
- invoice follow-up;
- matter closure.

---

# 2. Workflow Structure

A workflow contains:

- trigger;
- steps;
- conditions;
- actions;
- permissions;
- failure handling;
- completion state.

---

# 3. Workflow Lifecycle

TRIGGERED
↓
RUNNING
↓
WAITING
↓
RUNNING
↓
COMPLETED

Alternative states:

- FAILED;
- CANCELLED;
- PAUSED;
- REQUIRES_REVIEW.

---

# 4. Workflow Components

WorkflowBuilder constructs definitions.

WorkflowEngine executes workflows.

WorkflowManager coordinates application operations.

WorkflowPolicy controls permissions.

WorkflowSerializer serialises workflow data.

WorkflowRepository persists workflow data.

WorkflowEvents communicates workflow state changes.

---

# 5. Human Review

Workflows must support human review.

A workflow should pause when:

- legal judgement is required;
- AI confidence is insufficient;
- required documents conflict;
- compliance risk is high;
- an external submission requires confirmation;
- a destructive operation is proposed.

---

# 6. Failure Handling

Workflow failures must:

- record the failure;
- preserve the current state;
- avoid duplicate actions;
- provide retry capability where safe;
- notify authorised users when necessary;
- create an audit event.

---

# 7. Idempotency

Actions that can be repeated must be designed to avoid unintended duplication.

Examples:

- sending notifications;
- generating bundles;
- creating invoices;
- submitting applications;
- importing records.

---

# 8. Workflow Security

A workflow must never grant permissions simply because a user reached a workflow step.

Permissions are determined independently by security and policy layers.
