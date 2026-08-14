/**
 * BundleEngine
 * ------------------------------------------------------------
 * Coordinates document/application bundle creation.
 *
 * Connects:
 * - DocumentEngine
 * - KnowledgeEngine
 * - EligibilityEngine
 * - BundleExporter
 * - MatterEngine
 */

export class BundleEngine {
    constructor({
        documentEngine = null,
        knowledgeEngine = null,
        eligibilityEngine = null,
        matterEngine = null,
        bundleExporter = null,
        eventDispatcher = null,
        logger = console
    } = {}) {
        this.documentEngine =
            documentEngine;
        this.knowledgeEngine =
            knowledgeEngine;
        this.eligibilityEngine =
            eligibilityEngine;
        this.matterEngine =
            matterEngine;
        this.bundleExporter =
            bundleExporter;
        this.eventDispatcher =
            eventDispatcher;
        this.logger = logger;
    }

    async build(
        matter,
        options = {}
    ) {
        if (!matter) {
            throw new Error(
                "Matter is required"
            );
        }

        const checklist =
            await this.getChecklist(
                matter,
                options
            );

        const documents =
            await this.getDocuments(
                matter,
                options
            );

        const bundle = {
            matter,
            checklist,
            documents,
            metadata: {
                bundleId:
                    options.bundleId ||
                    null,
                generatedAt:
                    new Date().toISOString(),
                ...(
                    options.metadata ||
                    {}
                )
            }
        };

        if (
            this.bundleExporter
                ?.prepare
        ) {
            return this.bundleExporter.prepare(
                bundle,
                options
            );
        }

        return bundle;
    }

    async getChecklist(
        matter,
        options
    ) {
        if (
            this.knowledgeEngine
                ?.getRequiredDocuments
        ) {
            return this.knowledgeEngine.getRequiredDocuments(
                matter,
                options
            );
        }

        if (
            this.eligibilityEngine
                ?.getRequiredDocuments
        ) {
            return this.eligibilityEngine.getRequiredDocuments(
                matter,
                options
            );
        }

        return [];
    }

    async getDocuments(
        matter,
        options
    ) {
        if (
            this.documentEngine
                ?.getMatterDocuments
        ) {
            return this.documentEngine.getMatterDocuments(
                matter,
                options
            );
        }

        return Array.isArray(
            matter.documents
        )
            ? matter.documents
            : [];
    }

    async validate(
        bundle,
        options = {}
    ) {
        if (
            this.bundleExporter
                ?.getReadyState
        ) {
            return this.bundleExporter.getReadyState(
                bundle
            );
        }

        const checklist =
            bundle?.checklist || [];

        const outstanding =
            checklist.filter(
                (item) =>
                    item.required !==
                        false &&
                    !(
                        item.documentId ||
                        item.supplied ||
                        item.received
                    )
            );

        return {
            ready:
                outstanding.length ===
                0,
            outstanding
        };
    }

    async export(
        bundle,
        options = {}
    ) {
        if (
            !this.bundleExporter
        ) {
            throw new Error(
                "BundleExporter is required"
            );
        }

        if (
            options.format === "pdf"
        ) {
            return this.bundleExporter.exportPDF(
                bundle,
                options
            );
        }

        return this.bundleExporter.exportJSON(
            bundle,
            options
        );
    }
}

export default BundleEngine;
