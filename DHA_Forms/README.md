# DHA Forms Library

This directory contains the semantic immigration-form specifications used to build the Isaacs & Partners immigration-document engine.

## Current state

The latest reviewed repository commit is `fca7fa2879fdd4eeb9c889737e4feec056adfacc` (2026-09-26 09:11:54 UTC), which added the comprehensive `DHA_Forms/forms` Annexures 17–56 schema.

### Generation status

| Form | Current state | PDF generation |
|---|---|---|
| DHA-84 / Form 11 | Certified in `app/knowledgebase` | Enabled |
| DHA-1738 / Form 8 | Semantic schema constructed | Pending coordinate certification |
| DHA-1739 / Form 10 | Semantic schema constructed | Pending coordinate certification |
| DHA-1712A / Form 12 | Semantic schema constructed | Pending coordinate certification |
| BI-947 / Permanent Residence | Semantic schema constructed | Pending coordinate certification |
| Forms 1–4 aggregate | Present in `DHA-1740` | Not generation-authorised |
| Annexures 17–56 aggregate | Present in `forms` | Reference schema only |

## Safety rule

A semantic schema does **not** authorise PDF generation.

A form becomes generation-ready only after:

1. the exact source PDF is identified and hashed;
2. the semantic field map is reconciled against that source;
3. every required coordinate is physically verified against the exact PDF;
4. rendering is tested;
5. output is validated against the source layout; and
6. the form is explicitly marked generation-capable in the engine registry.

Do not create a second independent coordinate-map source when a canonical verified map already exists under `app/knowledgebase/immigration_docs/coordinate-maps`.

## Naming warning

`DHA_Forms/DHA-1740` is currently a misnamed aggregate file. Its content describes Forms 1–4 (DHA-1756, DHA-1714A, DHA-26 and DHA-TC-01), not a standalone DHA-1740 application. It should be normalised in a later controlled cleanup rather than silently overwritten.
