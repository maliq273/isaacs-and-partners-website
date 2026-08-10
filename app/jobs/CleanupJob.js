/**
 * CleanupJob
 * ------------------------------------------------------------
 * Removes expired temporary records and files.
 *
 * Intended to integrate with:
 * - StorageProvider
 * - UploadManager
 * - Database
 * - DocumentRepository
 */

export class CleanupJob {
    constructor({
        storage = null,
        uploadManager = null,
        database = null,
        logger = console
    } = {}) {
        this.storage = storage;
        this.uploadManager = uploadManager;
        this.database = database;
        this.logger = logger;
        this.name = "CleanupJob";
    }

    async execute(options = {}) {
        const startedAt = Date.now();

        try {
            const results = [];

            if (
                this.storage &&
                typeof this.storage.cleanup ===
                    "function"
            ) {
                results.push(
                    await this.storage.cleanup(
                        options
                    )
                );
            }

            if (
                this.uploadManager &&
                typeof this.uploadManager.cleanup ===
                    "function"
            ) {
                results.push(
                    await this.uploadManager.cleanup(
                        options
                    )
                );
            }

            if (
                this.database &&
                typeof this.database.cleanup ===
                    "function"
            ) {
                results.push(
                    await this.database.cleanup(
                        options
                    )
                );
            }

            return {
                success: true,
                job: this.name,
                startedAt,
                completedAt: Date.now(),
                duration:
                    Date.now() - startedAt,
                results
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
                        "Cleanup failed"
                }
            };
        }
    }
}

export default CleanupJob;
