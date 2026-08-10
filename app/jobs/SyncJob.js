/**
 * SyncJob
 * ------------------------------------------------------------
 * Synchronises local and remote application state.
 *
 * Designed for:
 * - Supabase synchronisation
 * - local-first storage
 * - offline/online reconciliation
 * - document metadata synchronisation
 * - matter/client updates
 */

export class SyncJob {
    constructor({
        syncManager = null,
        storage = null,
        logger = console
    } = {}) {
        this.syncManager = syncManager;
        this.storage = storage;
        this.logger = logger;
        this.name = "SyncJob";
    }

    async execute(options = {}) {
        const startedAt = Date.now();

        try {
            const result =
                await this.sync(
                    options
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
                        "Synchronisation failed"
                }
            };
        }
    }

    async sync(options) {
        if (
            this.syncManager &&
            typeof this.syncManager.sync ===
                "function"
        ) {
            return this.syncManager.sync(
                options
            );
        }

        if (
            this.storage &&
            typeof this.storage.sync ===
                "function"
        ) {
            return this.storage.sync(
                options
            );
        }

        throw new Error(
            "SyncJob requires SyncManager or sync-capable storage"
        );
    }
}

export default SyncJob;
