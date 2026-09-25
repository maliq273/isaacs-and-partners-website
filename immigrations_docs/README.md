# Immigration document source library

The PDFs in this directory are the original source documents. Do not edit or replace them as part of text ingestion.

The GitHub Actions workflow .github/workflows/ingest-immigration-pdfs.yml extracts:
- page counts and SHA-256 hashes;
- layout-preserving text;
- bounding-box text coordinates for flattened-form mapping;
- OCR text when a PDF has insufficient extractable text;
- search hits for e-billable/billable references.

Generated knowledge lives under app/knowledgebase/immigration_docs/ and never replaces the original PDFs.
\n\n<!-- Field-map rebuild trigger: 2026-09-25 / render-verify-2 -->\n
<!-- Coordinate-map verification trigger: 2026-09-25T20:20Z -->

<!-- Coordinate map build trigger: 2026-09-25T20:35Z -->
