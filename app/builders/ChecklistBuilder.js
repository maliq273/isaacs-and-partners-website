/**
 * ChecklistBuilder
 *
 * Builds a structured checklist from requirements,
 * documents and matter information.
 */

export default class ChecklistBuilder {
    constructor({
        matter = null,
        requirements = [],
        documents = [],
    } = {}) {
        this.matter = matter;
        this.requirements = [...requirements];
        this.documents = [...documents];
    }

    setMatter(matter) {
        this.matter = matter;
        return this;
    }

    addRequirement(requirement) {
        if (!requirement) {
            throw new Error("Requirement is required");
        }

        this.requirements.push(requirement);
        return this;
    }

    addRequirements(requirements = []) {
        requirements.forEach(
            requirement => this.addRequirement(requirement)
        );

        return this;
    }

    setDocuments(documents = []) {
        this.documents = [...documents];
        return this;
    }

    build() {
        const items = this.requirements.map(
            (requirement, index) => {
                const document = this.findDocument(
                    requirement
                );

                return {
                    number:
                        requirement.sequence ||
                        index + 1,

                    id:
                        requirement.id ||
                        `REQ-${index + 1}`,

                    name:
                        requirement.name ||
                        requirement.description ||
                        "Required item",

                    category:
                        requirement.category ||
                        "General",

                    required:
                        requirement.required !== false,

                    status:
                        document
                            ? this.resolveStatus(document)
                            : "OUTSTANDING",

                    documentId:
                        document?.id ||
                        null,

                    notes:
                        requirement.notes ||
                        null,
                };
            }
        );

        return {
            matterId: this.matter?.id || null,
            matterNumber:
                this.matter?.matterNumber || null,

            generatedAt:
                new Date().toISOString(),

            total: items.length,

            completed:
                items.filter(
                    item =>
                        item.status === "COMPLETE"
                ).length,

            outstanding:
                items.filter(
                    item =>
                        item.status === "OUTSTANDING"
                ).length,

            items,
        };
    }

    findDocument(requirement) {
        return this.documents.find(document => {
            return (
                (
                    requirement.documentId &&
                    document.id === requirement.documentId
                ) ||
                (
                    requirement.documentType &&
                    document.documentType ===
                        requirement.documentType
                ) ||
                (
                    requirement.type &&
                    document.type === requirement.type
                )
            );
        }) || null;
    }

    resolveStatus(document) {
        if (
            document.status === "APPROVED" ||
            document.status === "VERIFIED"
        ) {
            return "COMPLETE";
        }

        if (document.status === "REJECTED") {
            return "REJECTED";
        }

        if (document.status === "PENDING") {
            return "PENDING";
        }

        return "SUBMITTED";
    }

    getOutstanding() {
        return this.build().items.filter(
            item => item.status === "OUTSTANDING"
        );
    }

    isComplete() {
        return this.getOutstanding().length === 0;
    }
}
