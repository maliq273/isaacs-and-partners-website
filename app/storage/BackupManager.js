/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * BackupManager
 * ============================================================
 */

export default class BackupManager {

    constructor(options = {}) {

        this.provider =
            options.provider ?? null;

        this.encryption =
            options.encryption ?? null;

        this.version =
            options.version ?? 1;

        // =====================================================
        // FUTURE INSERT
        // GitHub backup integration
        // Cloud backup
        // Automated scheduled backups
        // Backup retention policy
        // =====================================================

    }


    setProvider(provider) {

        this.provider = provider;

        return this;

    }


    setEncryptionProvider(encryption) {

        this.encryption = encryption;

        return this;

    }


    async createBackup(metadata = {}) {

        if (!this.provider) {

            throw new Error(
                "Backup provider is not configured."
            );

        }

        const entries =
            await this.provider.entries();

        const backup = {

            version: this.version,

            createdAt:
                new Date().toISOString(),

            metadata,

            entries

        };


        if (this.encryption) {

            backup.encrypted =
                true;

            backup.payload =
                await this.encryption.encrypt(
                    backup.entries
                );

            delete backup.entries;

        } else {

            backup.encrypted =
                false;

        }


        return backup;

    }


    async downloadBackup(metadata = {}) {

        const backup =
            await this.createBackup(
                metadata
            );

        const json =
            JSON.stringify(
                backup,
                null,
                2
            );

        const blob =
            new Blob(
                [json],
                {
                    type:
                        "application/json"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const anchor =
            document.createElement(
                "a"
            );

        anchor.href = url;

        anchor.download =
            `isaacs-backup-${Date.now()}.json`;

        anchor.click();

        URL.revokeObjectURL(url);

        return backup;

    }


    // =========================================================
    // FUTURE INSERT
    // GitHub repository archival
    // Automatic backup schedules
    // Backup integrity hashes
    // Backup encryption enforcement
    // =========================================================

}
