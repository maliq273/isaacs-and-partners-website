/**
 * BackupJob
 * ------------------------------------------------------------
 * Creates application/database backups.
 *
 * Designed to integrate with:
 * - BackupManager
 * - Database
 * - StorageProvider
 */

export class BackupJob {
    constructor({
        backupManager = null,
        database = null,
        logger = console
    } = {}) {
        this.backupManager = backupManager;
        this.database = database;
        this.logger = logger;
        this.name = "BackupJob";
    }

    async execute(options = {}) {
        const startedAt = Date.now();

        try {
            const result =
                await this.createBackup(
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
                        "Backup failed"
                }
            };
        }
    }

    async createBackup(options) {
        if (
            this.backupManager &&
            typeof this.backupManager.backup ===
                "function"
        ) {
            return this.backupManager.backup(
                options
            );
        }

        if (
            this.database &&
            typeof this.database.backup ===
                "function"
        ) {
            return this.database.backup(
                options
            );
        }

        throw new Error(
            "BackupJob requires BackupManager or Database"
        );
    }
}

export default BackupJob;
