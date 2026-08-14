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
