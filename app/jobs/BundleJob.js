/**
 * BundleJob
 * ------------------------------------------------------------
 * Generates application/document bundles.
 *
 * Intended for:
 * - Immigration bundles
 * - DHA submissions
 * - VFS submissions
 * - Legal bundles
 * - CCMA bundles
 * - Client matter files
 *
 * The actual bundle generation belongs to the relevant
 * manager/service. This job controls execution.
 */

export class BundleJob {
    constructor({
        bundleManager = null,
        documentService = null,
        logger = console
    } = {}) {
        this.bundleManager = bundleManager;
        this.documentService = documentService;
        this.logger = logger;
        this.name = "BundleJob";
    }

    async execute(payload = {}) {
        const startedAt = Date.now();

        try {
            const result =
                await this.generateBundle(
                    payload
                );

            return {
                success: true,
                job: this.name,
                startedAt,
                completedAt: Date.now(),
                duration:
                    Date.now() - startedAt,
                result
            };
        } catch (error) {
            this.logger.error(
                `${this.name} failed`,
                error
            );

            return {
                success: false,
                job: this.name,
                startedAt,
                completedAt: Date.now(),
                error: {
                    message:
                        error?.message ||
                        "Bundle generation failed"
                }
            };
        }
    }

    async generateBundle(payload) {
        if (
            this.bundleManager &&
            typeof this.bundleManager.generate ===
                "function"
        ) {
            return this.bundleManager.generate(
                payload
            );
        }

        if (
            this.documentService &&
            typeof this.documentService.generateBundle ===
                "function"
        ) {
            return this.documentService.generateBundle(
                payload
            );
        }

        throw new Error(
            "BundleJob requires BundleManager or DocumentService"
        );
    }
}

export default BundleJob;
