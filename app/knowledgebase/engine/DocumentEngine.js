/**
 * DocumentEngine
 * ------------------------------------------------------------
 * Document intelligence layer for the knowledge base.
 *
 * Responsibilities:
 * - Classify documents
 * - Match documents to requirements
 * - Detect duplicates
 * - Determine missing documents
 * - Track document evidence
 * - Prepare document intelligence for bundle generation
 *
 * It intentionally does NOT claim that an uploaded document is
 * legally sufficient merely because its filename matches.
 */

export class DocumentEngine {
    constructor({
        requirementEngine = null,
        knowledgeEngine = null,
        logger = console
    } = {}) {
        this.requirementEngine =
            requirementEngine;

        this.knowledgeEngine =
            knowledgeEngine;

        this.logger = logger;
    }

    /**
     * Analyse a document.
     */
    analyse(document = {}) {
        const text = this.buildSearchText(
            document
        );

        return {
            documentId:
                document.id ||
                document.documentId ||
                null,

            fileName:
                document.fileName ||
                document.name ||
                null,

            detectedTypes:
                this.detectTypes(text),

            confidence:
                this.calculateConfidence(text),

            metadata: {
                issueDate:
                    document.issueDate || null,

                expiryDate:
                    document.expiryDate || null,

                issuingAuthority:
                    document.issuingAuthority ||
                    null,

                documentNumber:
                    document.documentNumber ||
                    null
            },

            flags: this.detectFlags(document, text)
        };
    }

    /**
     * Match uploaded documents to requirements.
     */
    matchRequirements({
        requirements = [],
        documents = []
    } = {}) {
        if (!this.requirementEngine) {
            throw new Error(
                "DocumentEngine requires RequirementEngine for requirement matching"
            );
        }

        return this.requirementEngine.validateDocuments(
            {
                requirements,
                documents
            }
        );
    }

    /**
     * Identify duplicates.
     */
    detectDuplicates(documents = []) {
        const groups = new Map();

        documents.forEach((document) => {
            const key =
                document.documentHash ||
                document.hash ||
                this.normaliseName(
                    document.fileName ||
                    document.name ||
                    ""
                );

            if (!groups.has(key)) {
                groups.set(key, []);
            }

            groups.get(key).push(document);
        });

        return Array.from(groups.entries())
            .filter(
                ([, documentsInGroup]) =>
                    documentsInGroup.length > 1
            )
            .map(([key, documentsInGroup]) => ({
                key,
                documents: documentsInGroup
            }));
    }

    /**
     * Detect common document types.
     */
    detectTypes(text) {
        const types = [];

        const rules = [
            {
                type: "passport",
                terms: [
                    "passport",
                    "travel document"
                ]
            },
            {
                type: "identity_document",
                terms: [
                    "identity document",
                    "identity number",
                    "id number"
                ]
            },
            {
                type: "police_clearance",
                terms: [
                    "police clearance",
                    "criminal record"
                ]
            },
            {
                type: "employment_contract",
                terms: [
                    "employment contract",
                    "employment agreement"
                ]
            },
            {
                type: "payslip",
                terms: [
                    "payslip",
                    "salary slip",
                    "pay slip"
                ]
            },
            {
                type: "bank_statement",
                terms: [
                    "bank statement",
                    "account statement"
                ]
            },
            {
                type: "invoice",
                terms: [
                    "invoice",
                    "tax invoice"
                ]
            },
            {
                type: "power_of_attorney",
                terms: [
                    "power of attorney",
                    "authority to act"
                ]
            },
            {
                type: "visa",
                terms: [
                    "visa",
                    "temporary residence"
                ]
            },
            {
                type: "refugee_document",
                terms: [
                    "refugee",
                    "asylum",
                    "section 22",
                    "section 24"
                ]
            }
        ];

        for (const rule of rules) {
            if (
                rule.terms.some((term) =>
                    text.includes(term)
                )
            ) {
                types.push(rule.type);
            }
        }

        return types;
    }

    /**
     * Confidence score.
     */
    calculateConfidence(text) {
        if (!text) {
            return 0;
        }

        const types = this.detectTypes(text);

        if (!types.length) {
            return 0.15;
        }

        if (types.length === 1) {
            return 0.75;
        }

        return Math.min(
            0.95,
            0.75 + types.length * 0.05
        );
    }

    /**
     * Detect document risk flags.
     */
    detectFlags(document, text) {
        const flags = [];

        if (
            document.expiryDate &&
            this.isExpired(document.expiryDate)
        ) {
            flags.push("EXPIRED");
        }

        if (
            !document.documentHash &&
            !document.hash
        ) {
            flags.push("HASH_NOT_AVAILABLE");
        }

        if (!text) {
            flags.push("NO_TEXT_AVAILABLE");
        }

        if (
            document.verified === false
        ) {
            flags.push("NOT_VERIFIED");
        }

        return flags;
    }

    /**
     * Build searchable text.
     */
    buildSearchText(document) {
        return [
            document.name,
            document.fileName,
            document.title,
            document.type,
            document.documentType,
            document.ocrText,
            document.text,
            document.description,
            ...(document.tags || [])
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
    }

    /**
     * Check expiry.
     */
    isExpired(date) {
        const expiry = new Date(date);

        if (Number.isNaN(expiry.getTime())) {
            return false;
        }

        return expiry < new Date();
    }

    /**
     * Normalise filename.
     */
    normaliseName(value) {
        return String(value)
            .toLowerCase()
            .replace(/\.[^/.]+$/, "")
            .replace(/[^a-z0-9]/g, "");
    }
}

export default DocumentEngine;
