# AI Engine

## 1. Purpose

The AI Engine is the intelligence layer of the Isaacs and Partners application.

It is responsible for:

- analysing client and matter information;
- classifying matters;
- identifying applicable services;
- determining eligibility;
- identifying required documentation;
- identifying missing documentation;
- assessing risk;
- generating recommendations;
- assisting with consultation workflows;
- querying the legal and operational knowledgebase;
- supporting document analysis;
- assisting with workflow generation;
- maintaining explainable AI results.

The AI Engine does not replace professional legal judgment.

Where a decision requires legal interpretation, professional discretion, or
verification against an authoritative source, the system must identify that
requirement and present the relevant information for human review.

---

## 2. Architecture

The AI layer is divided into specialised components.

```text
AIEngine
│
├── AIManager
│
├── AIFactory
│
├── AIService
│
├── Analysis
├── Classifier
├── Parser
├── Planner
├── Prompt Builder
├── Decision Tree
├── Document Analyser
├── Matter Generator
├── Recommendations
├── Risk Engine
├── Router
├── Memory
└── Skills

The AI Engine integrates with:

Knowledgebase
      │
      ▼
KnowledgeEngine
      │
      ▼
AIEngine
      │
 ┌────┼────────┐
 ▼    ▼        ▼
Matter Document Workflow
3. Core Responsibilities
3.1 Matter Classification

The engine must determine the likely matter category from the available
information.

Examples:

immigration;
visa application;
visa appeal;
refugee matter;
labour;
CCMA;
HR;
contract;
business;
mediation;
notary;
legal advice.

Classification must produce:

{
    category,
    confidence,
    reasons,
    risks,
    recommendedNextStep
}

Classification is advisory until confirmed by an authorised user.

4. Consultation Intelligence

The consultation process should follow:

Client
  ↓
Initial Consultation
  ↓
Facts Captured
  ↓
Issue Identification
  ↓
Potential Service
  ↓
Document Requirements
  ↓
Eligibility Analysis
  ↓
Risk Analysis
  ↓
Professional Review
  ↓
Matter Creation

The AI should distinguish between:

Confirmed facts

Facts explicitly supplied by the client or verified from documents.

Unverified statements

Information supplied by the client but not independently verified.

AI inference

Information inferred from available facts.

Professional determination

A decision requiring review or confirmation by an authorised professional.

These categories must never be silently merged.

5. Knowledgebase Integration

The AI Engine must use the application knowledgebase as its primary
application-specific source.

Relevant knowledgebase domains include:

business;
CCMA;
contracts;
HR;
immigration;
labour;
mediation;
notary.

The engine should retrieve relevant material before producing a substantive
legal or compliance recommendation.

Question
   ↓
Knowledge Search
   ↓
Relevant Sources
   ↓
Source Validation
   ↓
AI Reasoning
   ↓
Recommendation
   ↓
Human Review
6. Source Priority

When legal information is required, the engine should prioritise:

legislation;
regulations;
official government material;
official court / tribunal material;
authoritative judgments;
authoritative institutional guidance;
approved internal knowledge;
secondary commentary;
internal case studies.

Internal case studies must not be represented as law.

7. Legal Accuracy

The AI must not invent:

legislation;
regulations;
court judgments;
case citations;
sections of Acts;
immigration requirements;
government forms;
deadlines;
procedural requirements;
fees.

Where the knowledgebase does not contain sufficient authority, the result
must identify the information as requiring verification.

Example:

{
    status: "REQUIRES_VERIFICATION",
    reason: "Authoritative source not available",
    recommendation: "Verify against current official source"
}
8. Document Intelligence

The AI Engine can receive documents through the Document Engine.

The document pipeline is:

Upload
  ↓
Validation
  ↓
OCR
  ↓
Text Extraction
  ↓
Document Classification
  ↓
Entity Extraction
  ↓
Requirement Matching
  ↓
Matter Association
  ↓
Verification

The AI may identify:

passport information;
names;
dates;
reference numbers;
document types;
expiry dates;
employer details;
company details;
application information;
inconsistencies;
missing information.

Sensitive information must only be exposed to authorised application
components.

9. Requirement Engine

The Requirement Engine determines what documents or information are required
for a matter.

The output should support:

{
    required: [],
    received: [],
    missing: [],
    rejected: [],
    expired: [],
    needsVerification: []
}

Documents must not be marked as verified merely because OCR successfully
read them.

OCR extraction and document verification are separate operations.

10. Risk Engine

Risk analysis should identify issues such as:

missing documentation;
contradictory information;
expired documents;
procedural risks;
deadline risks;
eligibility concerns;
compliance risks;
unsupported claims;
incomplete client information.

Each risk should contain:

{
    code,
    severity,
    title,
    description,
    evidence,
    recommendedAction
}

Severity should use the application's canonical risk levels.

11. Explainability

Every substantive AI recommendation should be traceable.

The system should retain:

{
    input,
    sources,
    reasoningSummary,
    findings,
    recommendation,
    confidence,
    risks,
    generatedAt
}

The system should not expose private chain-of-thought.

Instead it should provide an auditable summary of:

relevant facts;
applicable sources;
conclusions;
assumptions;
risks;
recommended actions.
12. Human Review

The following should normally require human review:

legal advice;
eligibility decisions;
immigration submissions;
appeals;
disciplinary recommendations;
termination-related recommendations;
contractual interpretation;
high-risk compliance matters;
document rejection;
adverse findings.

AI output should therefore support the professional rather than silently
finalise the professional decision.

13. AI Result Contract

AI results should be compatible with:

app/results/AIResult.js

A typical result:

{
    success: true,
    type: "analysis",
    confidence: 0.92,
    findings: [],
    recommendations: [],
    risks: [],
    sources: [],
    requiresReview: true,
    generatedAt: "..."
}
14. Failure Handling

The AI Engine must fail safely.

If an AI provider is unavailable:

AI unavailable
     ↓
Application continues
     ↓
Manual workflow available

AI failure must not corrupt:

matters;
documents;
appointments;
clients;
payments;
workflows;
audit records.
15. Security

The AI Engine must:

respect authenticated sessions;
respect role permissions;
avoid unnecessary transmission of sensitive information;
never expose another client's matter;
maintain audit records where required;
validate all AI-generated structured output;
reject malformed AI responses.
16. Production Principle

The AI Engine is an assistance and automation layer.

The authoritative state of the application remains in the application's
domain, repositories, storage and approved knowledgebase.

AI-generated information must never silently become authoritative business
data.
