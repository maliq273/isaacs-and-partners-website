/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * MigrationManager
 * ============================================================
 */

export default class MigrationManager {

    constructor(options = {}) {

        this.currentVersion =
            options.currentVersion ?? 1;

        this.migrations =
            options.migrations ?? [];

        this.provider =
            options.provider ?? null;

    }


    register(version, migration) {

        if (
            typeof migration !==
            "function"
        ) {

            throw new Error(
                "Migration must be a function."
            );

        }

        this.migrations.push({
            version,
            migration
        });

        this.migrations.sort(
            (a, b) =>
                a.version - b.version
        );

        return this;

    }


    async migrate(
        fromVersion,
        toVersion = this.currentVersion
    ) {

        if (!this.provider) {

            throw new Error(
                "Migration provider is not configured."
            );

        }

        let version =
            fromVersion;


        const applicable =
            this.migrations.filter(
                migration =>
                    migration.version >
                        version &&
                    migration.version <=
                        toVersion
            );


        for (
            const migration
            of applicable
        ) {

            await migration.migration(
                this.provider
            );

            version =
                migration.version;

        }


        return version;

    }


    // =========================================================
    // FUTURE INSERT
    //
    // Version migrations:
    //
    // v1 → base storage
    // v2 → client schema
    // v3 → matter schema
    // v4 → document schema
    // v5 → workflow schema
    //
    // =========================================================

}
