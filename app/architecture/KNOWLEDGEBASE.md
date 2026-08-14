# Knowledgebase Architecture

## 1. Purpose

The knowledgebase provides structured domain knowledge for the application.

Current domains:

- business;
- CCMA;
- contracts;
- HR;
- immigration;
- labour;
- mediation;
- notary.

---

# 2. Source Hierarchy

Where possible, information should be ranked approximately as:

1. Constitution / legislation;
2. regulations;
3. official government publications;
4. binding judicial authority;
5. applicable tribunal / CCMA authority;
6. official institutional guidance;
7. recognised legal commentary;
8. internal research;
9. internal case studies.

The system must preserve the distinction between authority levels.

---

# 3. Knowledge Record Metadata

Each substantive knowledge item should support:

- title;
- domain;
- jurisdiction;
- source type;
- issuing authority;
- citation;
- URL or source reference;
- publication date;
- effective date;
- repeal/replacement status;
- version;
- verified date;
- reviewer;
- authority level;
- summary;
- detailed content;
- related topics;
- related services.

---

# 4. South African Jurisdiction

South African legal knowledge must be identified as South African unless a different jurisdiction is explicitly specified.

Relevant areas include:

## Immigration

- Immigration Act;
- Immigration Regulations;
- refugee/asylum framework;
- DHA procedures;
- VFS procedures;
- citizenship;
- permanent residence;
- appeals and representations.

## Labour / HR

- Labour Relations Act;
- Basic Conditions of Employment Act;
- Employment Equity Act;
- Occupational Health and Safety legislation;
- Compensation for Occupational Injuries and Diseases legislation;
- Unemployment Insurance legislation;
- applicable bargaining council instruments.

## Business

- Companies legislation;
- CIPC requirements;
- SARS requirements;
- tax administration;
- VAT;
- PAYE;
- UIF;
- COIDA;
- annual returns and compliance.

## Legal / Contractual

- common law;
- contract principles;
- relevant legislation;
- mediation;
- notarial requirements;
- powers of attorney;
- affidavits;
- settlement agreements.

---

# 5. Currentness

Legal knowledge is time-sensitive.

The system must not treat a source as permanently current.

Every legal source should have:

- verification date;
- effective date where available;
- current-status flag;
- superseded status where applicable.

---

# 6. Knowledge Engine

KnowledgeEngine coordinates retrieval.

KnowledgeLoader loads source data.

KnowledgeIndexer creates searchable indexes.

KnowledgeSearch retrieves relevant sources.

RequirementEngine converts knowledge into structured requirements.

RuleEngine evaluates deterministic rules.

---

# 7. AI Relationship

AI should retrieve knowledge rather than inventing legal requirements.

The knowledgebase should therefore be consulted before generating:

- checklists;
- eligibility analysis;
- document requirements;
- compliance recommendations;
- legal research summaries.

---

# 8. Internal Case Studies

Internal case studies must be clearly marked as internal material.

They must not automatically be presented as law.

Internal case studies may assist with:

- precedent within the organisation;
- workflow;
- document patterns;
- practical lessons;
- risk identification.

They must remain distinguishable from external legal authority.
