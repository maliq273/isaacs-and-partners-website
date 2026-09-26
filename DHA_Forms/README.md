# DHA Forms Library

This folder is the immigration-document-engine's DHA form source and semantic registry.

## Canonical structure

- `DHA_Forms/official/` — canonical Form 1–21 semantic records plus Form 50.
- `DHA_Forms/official/index.json` — authoritative inventory used to determine whether a form exists in the library.
- `DHA_Forms/forms` — legacy aggregate schema covering Annexures 17–56; retained as reference.
- `DHA_Forms/second_ammendments` — legacy 2024 amendment/reference schema; retained as reference.
- `DHA_Forms/DHA-1740` — legacy aggregate containing Forms 1–4; retained for compatibility. It is **not** the standalone Form 9 schema.

## Official Form 1–50 coverage

All Form 1 through Form 50 records are now present under `official/`, including the administrative, enforcement, maritime, fine, exemption, waiver and appeal forms.

1. DHA-1756
2. DHA-1714A
3. DHA-26
4. DHA-TC-01
5. DHA-1565
6. DHA-1746
7A. Form 7A
7B. Form 7B
7C. Form 7C
8. DHA-1738
9. DHA-1740
10. DHA-1739
11. DHA-84
12. DHA-1712A
13. DHA-1743
14. DHA-1718
15. DHA-1733
16. DHA-1758
17. DHA-1732
18. DHA-947
19. DHA-46
20. DHA-1759
21. DHA-1684

Form 50 (Change of Address) is explicitly included under Regulation 40.

### Complete inventory

Forms 1–50 are represented in `DHA_Forms/official/index.json`. The official DHA source identifies these as Annexure A forms; some later forms are enforcement, detention, maritime, fine, exemption, waiver or appeal instruments rather than ordinary client application forms.

## Status model

A form being present does **not** mean PDF generation is enabled.

- **certified** — exact source PDF, semantic mapping, coordinate map and rendering validation have passed.
- **constructed** — semantic field model exists; coordinate certification is still required.
- **semantic_skeleton** — official form identity/source is established, but field-level construction remains to be completed.
- **generationAuthorised: false** — the document engine must not write to the PDF.

Currently DHA-84/Form 11 is the generation-certified form. The other records are deliberately gated.

## Safety gates

Before enabling generation for any form:

1. identify the exact source PDF;
2. hash the source PDF;
3. reconcile the semantic schema against that exact source;
4. physically verify every coordinate;
5. render a populated candidate;
6. compare the candidate to the source;
7. run negative/overflow/field-isolation tests;
8. only then mark the form generation-capable in the engine registry.

Do not create duplicate coordinate maps when a canonical map already exists under `app/knowledgebase/immigration_docs/coordinate-maps`.

## Source authority

The official DHA Immigration Regulations PDF identifies the Annexure A form inventory and distinguishes Forms 1–21, including Form 9 (DHA-1740), Form 11 (DHA-84), Form 18 (DHA-947), and Form 50 (Change of Address). The repository records should still be revalidated against the exact source PDF before generation is authorised.
