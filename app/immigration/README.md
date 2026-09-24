# Anthony Immigration Document Intelligence

This layer makes Anthony a document-production assistant rather than a generic immigration chatbot.

## Source hierarchy

1. Current official DHA / South African Government material.
2. Current official VFS/procedural material where applicable.
3. Isaacs & Partners approved internal procedures and templates.
4. Historical material only when the matter requires historical-law analysis.

The uploaded PDFs under /immigrations_docs are retained as original source templates/reference material.

## Core rules

- Anthony qualifies the applicant before generation.
- Missing material fields become questions.
- Conflicting evidence becomes a review item.
- AI may interpret and organise facts; it must not invent facts.
- Government forms are populated from canonical application data.
- The original government PDF is preserved; no re-designed substitute is used for the official form.
- Every generated document records template, source, timestamp and review status.
- No immigration bundle is marked submission-ready until Super Admin review passes.
- Current-law verification is required because immigration requirements can change.

## Case types

The interview and bundle planners cover temporary residence/visa applications, visitor visas, work routes, critical skills, general work, intra-company transfer, business visas, permanent residence, Section 22 asylum, Section 24 refugee status, immigration appeals and refugee appeals.

## PDF generation

The trusted server-side document function must:
1. retrieve the exact template;
2. inspect AcroForm fields where present;
3. populate only known mapped fields;
4. flatten the generated copy;
5. preserve the original file untouched;
6. create an audit record;
7. store the generated PDF privately;
8. return a signed download URL;
9. optionally queue the document to the authorised Super Admin WhatsApp channel.

Flattened/non-AcroForm PDFs require explicit coordinate mappings. They must never be approximated automatically and presented as an official completed form.

## Evidence states

CLIENT_PROVIDED, DOCUMENT_EXTRACTED, DOCUMENT_VERIFIED, SYSTEM_DERIVED, AUTHORITY_SOURCE, NEEDS_REVIEW, UNKNOWN.

## Important

This engine prepares applications for professional review. It does not make a legal determination that an applicant qualifies, and it does not submit to DHA/VFS without the required human approval.
