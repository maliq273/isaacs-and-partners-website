/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ArchiveScheduler
 * ------------------------------------------------------------
 * Identifies records eligible for archival.
 * ============================================================
 */

export default class ArchiveScheduler {

    constructor(options = {}) {

        this.handlers = new Map();

        this.retentionDays =
            options.retentionDays ?? 365;

        this.logger =
            options.logger ?? console;

        // ====================================================
        // FUTURE INSERT
        //
        // Matter archival
        // Document archival
        // Communication archival
        // Audit-log archival
        // Legal retention rules
        // Immigration retention rules
        // POPIA retention/deletion controls
        //
        // ====================================================
    }


    register(
        entityType,
        handler
    ) {

        if (
            typeof handler !==
            "function"
        ) {

            throw new Error(
                `Archive handler "${entityType}" must be a function.`
            );

        }

        this.handlers.set(
            entityType,
            handler
        );

        return this;

    }


    isEligible(
        entity
    ) {

        if (!entity) {

            return false;

        }

        if (
            entity.archived === true ||
            entity.status === "ARCHIVED"
        ) {

            return false;

        }

        const updatedAt =
            entity.updatedAt ??
            entity.createdAt;

        if (!updatedAt) {

            return false;

        }

        const age =
            Date.now() -
            new Date(updatedAt)
                .getTime();

        const retention =
            this.retentionDays *
            24 *
            60 *
            60 *
            1000;

        return age >= retention;

    }


    async archive(
        entityType,
        entity
    ) {

        if (
            !this.isEligible(
                entity
            )
        ) {

            return {

                archived: false,

                reason:
                    "Entity is not eligible for archival."

            };

        }

        const handler =
            this.handlers.get(
                entityType
            );

        if (!handler) {

            throw new Error(
                `No archive handler registered for ${entityType}.`
            );

        }

        try {

            const result =
                await handler(
                    entity
                );

            return {

                archived: true,

                entity,

                result,

                archivedAt:
                    new Date().toISOString()

            };

        } catch (error) {

            this.logger.error?.(
                `Archiving failed for ${entityType}.`,
                error
            );

            throw error;

        }

    }


    async run(
        entities = [],
        entityType
    ) {

        const results = [];

        for (
            const entity
            of entities
        ) {

            if (
                !this.isEligible(
                    entity
                )
            ) {

                continue;

            }

            results.push(
                await this.archive(
                    entityType,
                    entity
                )
            );

        }

        return results;

    }

}
