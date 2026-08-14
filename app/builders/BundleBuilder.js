/**
 * BundleBuilder
 *
 * Builds structured submission bundles from a matter,
 * document requirements and supplied documents.
 *
 * Designed for:
 * - DHA submissions
 * - VFS Global submissions
 * - Appeals
 * - CCMA / labour bundles
 * - Legal matter bundles
 * - Business compliance bundles
 *
 * The builder does not submit or print the bundle.
 * BundleEngine / BundleExporter handles that responsibility.
 */

export default class BundleBuilder {
    constructor({
        matter = null,
        documents = [],
        requirements = [],
        metadata = {},
    } = {}) {
        this.matter = matter;
        this.documents = [...documents];
        this.requirements = [...requirements];
        this.metadata = { ...metadata };
    }

    setMatter(matter) {
        this.matter = matter;
        return this;
    }

    addDocument(document) {
        if (!document) {
            throw new Error("Document is required");
        }

        this.documents.push(document);
        return this;
    }

    addDocuments(documents = []) {
        documents.forEach(document => this.addDocument(document));
        return this;
    }

    addRequirement(requirement) {
        if (!requirement) {
            throw new Error("Requirement is required");
        }

        this.requirements.push(requirement);
        return this;
    }

    setMetadata(metadata = {}) {
        this.metadata = {
            ...this.metadata,
            ...metadata,
        };

        return this;
    }

    build() {
        if (!this.matter) {
            throw new Error("A matter is required to build a bundle");
        }

        const entries = this.buildEntries();

        return {
            id: this.metadata.id || null,
            matterId: this.matter.id,
            matterNumber: this.matter.matterNumber || null,

            title:
                this.metadata.title ||
                `${this.matter.matterNumber || "Matter"} Submission Bundle`,

            destination:
                this.metadata.destination ||
                this.matter.destination ||
                null,

            createdAt: new Date().toISOString(),

            metadata: {
                ...this.metadata,
            },

            summary: {
                totalRequirements: this.requirements.length,
                totalDocuments: this.documents.length,
                outstanding: entries.filter(
                    entry => entry.status === "OUTSTANDING"
                ).length,
                complete: entries.filter(
                    entry => entry.status === "COMPLETE"
                ).length,
            },

            entries,
        };
    }

    buildEntries() {
        return this.requirements.map((requirement, index) => {
            const matchedDocument = this.findMatchingDocument(
                requirement
            );

            return {
                sequence:
                    requirement.sequence ??
                    index + 1,

                requirementId:
                    requirement.id ||
                    null,

                documentType:
                    requirement.documentType ||
                    requirement.type ||
                    null,

                description:
                    requirement.description ||
                    requirement.name ||
                    "Required document",

                required:
                    requirement.required !== false,

                status:
                    matchedDocument
                        ? "COMPLETE"
                        : "OUTSTANDING",

                documentId:
                    matchedDocument?.id ||
                    null,

                document:
                    matchedDocument || null,
            };
        });
    }

    findMatchingDocument(requirement) {
        return this.documents.find(document => {
            if (
                requirement.documentId &&
                document.id === requirement.documentId
            ) {
                return true;
            }

            if (
                requirement.documentType &&
                document.documentType === requirement.documentType
            ) {
                return true;
            }

            if (
                requirement.type &&
                document.type === requirement.type
            ) {
                return true;
            }

            return false;
        }) || null;
    }

    getOutstandingDocuments() {
        return this.build().entries.filter(
            entry => entry.status === "OUTSTANDING"
        );
    }

    getCompleteDocuments() {
        return this.build().entries.filter(
            entry => entry.status === "COMPLETE"
        );
    }

    isComplete() {
        return this.getOutstandingDocuments().length === 0;
    }
}
