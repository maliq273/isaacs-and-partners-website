# AI Architecture

## 1. Purpose

The AI layer provides controlled intelligence for:

- consultation;
- classification;
- document analysis;
- OCR analysis;
- eligibility;
- compliance;
- risk;
- recommendations;
- summaries;
- quality analysis;
- case analysis.

---

# 2. AI Is Not the System of Record

AI output must never silently overwrite authoritative matter information.

AI produces:

- observations;
- classifications;
- extracted information;
- recommendations;
- risk indicators;
- confidence;
- citations;
- proposed actions.

The application decides whether and how the result is committed.

---

# 3. AI Processing Pipeline

Input
↓
Normalisation
↓
Classification
↓
Knowledge Retrieval
↓
Requirement Analysis
↓
Prompt Construction
↓
AI Processing
↓
Structured Result
↓
Validation
↓
Risk / Compliance Review
↓
Recommendation
↓
Human Decision where required

---

# 4. Knowledge Grounding

AI should use the knowledgebase where a question involves:

- legislation;
- regulations;
- case law;
- immigration requirements;
- labour requirements;
- CCMA procedures;
- business compliance;
- contractual rules;
- notarial requirements.

AI should distinguish:

1. source-backed fact;
2. inference;
3. recommendation;
4. uncertainty.

---

# 5. Required AI Result Metadata

AI results should support:

- analysis type;
- matter ID;
- timestamp;
- model/provider;
- prompt version;
- knowledge sources;
- source versions;
- confidence;
- risk;
- recommendation;
- human review status.

---

# 6. Prompt Security

User-provided documents and text are untrusted input.

The system must prevent document contents from overriding system instructions.

Prompts should clearly separate:

- system instructions;
- application instructions;
- trusted knowledge;
- document content;
- user input;
- output requirements.

---

# 7. High-Risk AI Operations

The following require additional controls:

- legal conclusions;
- eligibility determinations;
- immigration recommendations;
- document rejection;
- fraud/risk flags;
- compliance failures;
- automated submissions;
- destructive actions.

Where appropriate, human confirmation is required.

---

# 8. AI Auditability

AI operations should record:

- what was analysed;
- when;
- by which model;
- using which prompt version;
- using which knowledge sources;
- resulting recommendation;
- confidence;
- reviewer;
- final decision.

---

# 9. AI Failure Principle

If the AI cannot establish an answer from authoritative available information, it must not fabricate one.

The preferred result is:

"Insufficient authoritative information — human verification required."

rather than an unsupported legal proposition.
