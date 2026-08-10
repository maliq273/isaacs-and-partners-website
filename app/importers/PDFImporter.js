/**
 * Isaacs & Partners
 * PDF Importer
 *
 * PDF ingestion boundary.
 *
 * The importer accepts an injected PDF parser rather than
 * embedding a particular PDF library into the application.
 *
 * Responsibilities:
 * - Read PDF files/data.
 * - Extract text through the injected parser.
 * - Preserve page boundaries where available.
 * - Preserve source metadata.
 * - Return evidence suitable for DocumentEngine/OCR processing.
 */

export class PDFImporter {
    constructor({
        parser = null,
        ocrService = null,
        logger = console
    } = {}) {
        this.parser = parser;
        this.ocrService = ocrService;
        this.logger = logger;
        this.name = "PDFImporter";
    }

    async import(source, options = {}) {
        if (!source) {
            throw new TypeError(
                "PDFImporter requires a PDF source"
            );
        }

        const startedAt =
            Date.now();

        try {
            const result =
                await this.extract(
                    source,
                    options
                );

            return {
                success: true,
                type: "pdf",
                source: this.getSourceMetadata(
                    source
                ),
                importedAt:
                    new Date().toISOString(),
                duration:
                    Date.now() -
                    startedAt,
                ...result
            };
        } catch (error) {
            this.logger.error(
                "PDF import failed",
                error
            );

            throw error;
        }
    }

    async extract(
        source,
        options
    ) {
        if (!this.parser) {
            if (
                options.ocr !== false &&
                this.ocrService
            ) {
                return this.extractWithOCR(
                    source,
                    options
                );
            }

            throw new Error(
                "PDFImporter requires a PDF parser or OCR service"
            );
        }

        let parsed;

        if (
            typeof this.parser.parse ===
            "function"
        ) {
            parsed =
                await this.parser.parse(
                    source,
                    options
                );
        } else if (
            typeof this.parser.extractText ===
            "function"
        ) {
            parsed = {
                text:
                    await this.parser.extractText(
                        source,
                        options
                    )
            };
        } else {
            throw new Error(
                "PDF parser must implement parse() or extractText()"
            );
        }

        return this.normaliseResult(
            parsed
        );
    }

    async extractWithOCR(
        source,
        options
    ) {
        if (
            typeof this.ocrService.process !==
            "function"
        ) {
            throw new Error(
                "OCR service must implement process()"
            );
        }

        const result =
            await this.ocrService.process(
                source,
                {
                    ...options,
                    sourceType: "pdf"
                }
            );

        return {
            text:
                result?.text || "",
            pages:
                result?.pages || [],
            ocr: true,
            confidence:
                result?.confidence ??
                null
        };
    }

    normaliseResult(result = {}) {
        const pages =
            Array.isArray(result.pages)
                ? result.pages
                : [];

        const text =
            result.text ||
            pages
                .map(
                    (page) =>
                        page.text ||
                        ""
                )
                .join("\n\n");

        return {
            text,
            pages,
            pageCount:
                result.pageCount ??
                pages.length,
            metadata:
                result.metadata || {},
            ocr:
                result.ocr === true,
            confidence:
                result.confidence ??
                null
        };
    }

    getSourceMetadata(source) {
        if (
            typeof source ===
            "string"
        ) {
            return {
                name: source,
                type: "path-or-url"
            };
        }

        return {
            name:
                source?.name ||
                null,

            type:
                source?.type ||
                "application/pdf",

            size:
                source?.size ??
                null,

            lastModified:
                source?.lastModified ??
                null
        };
    }
}

export default PDFImporter;
