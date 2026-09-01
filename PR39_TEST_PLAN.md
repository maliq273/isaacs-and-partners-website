# PR39 — Intelligent Document Understanding & Clarification Engine

## Purpose
Verify that document processing can represent whole-document understanding, preserve page/section evidence, stop on uncertainty, and obtain an explicit human clarification without exposing privileged AI credentials.

## Database
1. Apply `202609010005_document_understanding_clarifications.sql` after PR37/PR38 migrations.
2. Confirm the three tables exist:
   - `client_document_understandings`
   - `client_document_understanding_segments`
   - `client_document_clarifications`
3. Confirm RLS is enabled on all three tables.
4. Confirm normal authenticated users have SELECT only through document-access checks.
5. Confirm clarification creation is not exposed through an authenticated INSERT policy.
6. Confirm `submit_document_clarification(uuid,text)` is executable by authenticated users and validates document access.

## Understanding engine
1. Supply clear OCR/vision segments with confidence >= 0.85.
2. Confirm result state is `VALIDATED` when no uncertain segments exist.
3. Supply a segment with confidence below 0.85.
4. Confirm result state is `NEEDS_CLARIFICATION`.
5. Supply unreadable replacement characters (`�`, `□`) or repeated question marks.
6. Confirm the engine creates a clarification instruction instead of guessing.
7. Confirm page number, section label and detected text are retained in the clarification contract.
8. Confirm an empty or missing confidence value does not cause the engine to invent certainty.

## Human clarification
1. Insert a clarification request through the trusted worker/service role.
2. Sign in as the authorised client or assigned staff member.
3. Confirm the clarification is visible through RLS.
4. Submit the exact value through `DocumentUnderstandingService.answerClarification()`.
5. Confirm the clarification becomes `ANSWERED`, records `answered_by` and `answered_at`, and retains the answer.
6. Confirm the linked understanding moves back to `READING` and the document ingestion state moves to `OCR`.
7. Attempt to answer the same request twice; confirm the second attempt is rejected.
8. Attempt to answer a clarification belonging to an unauthorised matter; confirm access is rejected.

## Security
- No service-role key is present in browser modules.
- No AI provider secret is present in browser modules.
- Original documents remain in private Supabase Storage.
- AI/vision output is treated as evidence with confidence, not as silently verified fact.
- Human corrections remain auditable and trigger reprocessing rather than silently mutating the original document.

## Acceptance
PR39 passes when an unreadable section reliably produces a targeted clarification request, the answer is auditable, access remains RLS/matter scoped, and the document can re-enter processing without replacing the original source file.
