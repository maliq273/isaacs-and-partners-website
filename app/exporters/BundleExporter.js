/**
 * BundleExporter
 * ------------------------------------------------------------
 * Central export coordinator for matter/application bundles.
 *
 * Intended to work with:
 *
 * Matter
 * Documents
 * Bundle generation jobs
 * PDFExporter
 * MatterExporter
 *
 * The exporter does not decide whether a document is legally
 * required. That responsibility belongs to the requirement /
 * knowledge / workflow layers.
 *
 * It simply packages the already-approved bundle contents.
 */

export class BundleExporter {
    constructor({
        PDFExporter = null,
        MatterExporter = null,
        DocumentExporter = null,
        logger = console
    } = {}) {
        this.PDFExporter =
            PDFExporter;

        this.MatterExporter =
            MatterExporter;

        this.DocumentExporter =
            DocumentExporter;

        this.logger =
            logger;
    }

    prepare({
        matter = null,
        documents = [],
        checklist = [],
        metadata = {}
    } = {}) {
        if (!matter) {
            throw new Error(
                "Matter is required to create a bundle"
            );
        }

        return {
            bundleId:
                metadata.bundleId ||
                this.createBundleId(
                    matter
                ),

            createdAt:
                new Date().toISOString(),

            matter: matter,

            documents:
                Array.isArray(
                    documents
                )
                    ? documents
                    : [],

            checklist:
                Array.isArray(
                    checklist
                )
                    ? checklist
                    : [],

            metadata: {
                ...metadata
            }
        };
    }

    createBundleId(matter) {
        const identifier =
            matter?.matterNumber ||
            matter?.matter_number ||
            matter?.id ||
            "matter";

        return `BUNDLE-${this.safe(
            identifier
        )}-${this.timestamp()}`;
    }

    getOutstandingDocuments(
        bundle
    ) {
        const checklist =
            Array.isArray(
                bundle?.checklist
            )
                ? bundle.checklist
                : [];

        return checklist.filter(
            (item) => {
                const required =
                    item.required !==
                    false;

                const supplied =
                    Boolean(
                        item.documentId ||
                            item.supplied ||
                            item.received
                    );

                return (
                    required &&
                    !supplied
                );
            }
        );
    }

    getReadyState(bundle) {
        const outstanding =
            this.getOutstandingDocuments(
                bundle
            );

        return {
            ready:
                outstanding.length ===
                0,

            outstandingCount:
                outstanding.length,

            outstanding
        };
    }

    exportJSON(
        bundle,
        options = {}
    ) {
        const prepared =
            this.prepare(
                bundle
            );

        const exportData = {
            ...prepared,
            readiness:
                this.getReadyState(
                    prepared
                )
        };

        if (
            this.MatterExporter
        ) {
            const exporter =
                this.MatterExporter
                    .prototype
                    ? new this.MatterExporter()
                    : this.MatterExporter;

            exportData.matter =
                exporter.prepare(
                    prepared.matter,
                    options.matter ||
                        {}
                );
        }

        return JSON.stringify(
            exportData,
            null,
            2
        );
    }

    exportPDF(
        bundle,
        options = {}
    ) {
        if (!this.PDFExporter) {
            throw new Error(
                "PDFExporter dependency is required"
            );
        }

        const prepared =
            this.prepare(
                bundle
            );

        const readiness =
            this.getReadyState(
                prepared
            );

        const text =
            this.buildBundleText(
                prepared,
                readiness,
                options
            );

        const exporter =
            this.PDFExporter
                .prototype
                ? new this.PDFExporter(
                      options
                  )
                : this.PDFExporter;

        return exporter.export(
            text,
            {
                ...options,
                filename:
                    options.filename ||
                    `${prepared.bundleId}.pdf`
            }
        );
    }

    buildBundleText(
        bundle,
        readiness,
        options = {}
    ) {
        const matter =
            bundle.matter ||
            {};

        const lines = [
            options.title ||
                "APPLICATION / MATTER BUNDLE",
            "",
            `Bundle ID: ${bundle.bundleId}`,
            `Created: ${bundle.createdAt}`,
            "",
            `Matter Number: ${
                matter.matterNumber ||
                matter.matter_number ||
                matter.id ||
                ""
            }`,
            `Matter Title: ${
                matter.title ||
                ""
            }`,
            `Matter Type: ${
                matter.type ||
                matter.matterType ||
                ""
            }`,
            `Status: ${
                matter.status ||
                ""
            }`,
            "",
            `Documents: ${
                bundle.documents.length
            }`,
            `Outstanding Required Documents: ${
                readiness.outstandingCount
            }`,
            `Bundle Ready: ${
                readiness.ready
                    ? "YES"
                    : "NO"
            }`,
            ""
        ];

        if (
            readiness.outstanding.length
        ) {
            lines.push(
                "OUTSTANDING DOCUMENTS",
                ""
            );

            readiness.outstanding.forEach(
                (item, index) => {
                    lines.push(
                        `${index + 1}. ${
                            item.name ||
                            item.documentName ||
                            item.type ||
                            "Required document"
                        }`
                    );
                }
            );

            lines.push("");
        }

        lines.push(
            "DOCUMENT INDEX",
            ""
        );

        bundle.documents.forEach(
            (document, index) => {
                lines.push(
                    `${index + 1}. ${
                        document.name ||
                        document.fileName ||
                        document.filename ||
                        "Document"
                    }`
                );
            }
        );

        return lines.join(
            "\n"
        );
    }

    safe(value) {
        return String(value)
            .trim()
            .replace(
                /[^a-zA-Z0-9._-]+/g,
                "-"
            );
    }

    timestamp() {
        return new Date()
            .toISOString()
            .replace(
                /[^0-9]/g,
                ""
            )
            .substring(
                0,
                14
            );
    }
}

export default BundleExporter;
