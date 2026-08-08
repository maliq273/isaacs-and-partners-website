/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * RestoreManager
 * ============================================================
 */

export default class RestoreManager {

    constructor(options = {}) {

        this.provider =
            options.provider ?? null;

        this.encryption =
            options.encryption ?? null;

        this.expectedVersion =
            options.expectedVersion ?? 1;

        // =====================================================
        // FUTURE INSERT
        // Restore approval workflow
        // Supervisor authorization
        // Restore audit logging
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


    validateBackup(backup) {

        if (!backup) {

            throw new Error(
                "Backup is required."
            );

        }

        if (
            backup.version !==
            this.expectedVersion
        ) {

            throw new Error(
                `Unsupported backup version: ${backup.version}`
            );

        }

        return true;

    }


    async restore(backup, options = {}) {

        this.validateBackup(
            backup
        );

        if (!this.provider) {

            throw new Error(
                "Restore provider is not configured."
            );

        }

        let entries =
            backup.entries;


        if (
            backup.encrypted
        ) {

            if (!this.encryption) {

                throw new Error(
                    "Encrypted backup requires an encryption provider."
                );

            }

            entries =
                await this.encryption.decrypt(
                    backup.payload
                );

        }


        if (
            options.clearExisting === true
        ) {

            await this.provider.clear();

        }


        for (
            const [
                key,
                value
            ]
            of entries
        ) {

            await this.provider.set(
                key,
                value
            );

        }


        return {

            restored: true,

            count:
                entries.length,

            restoredAt:
                new Date().toISOString()

        };

    }


    // =========================================================
    // FUTURE INSERT
    // Partial restore
    // Matter-only restore
    // Client-only restore
    // Document-only restore
    // =========================================================

}
