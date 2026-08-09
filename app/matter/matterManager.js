/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Matter Manager
 * ------------------------------------------------------------
 * Coordinates persistence and lifecycle operations.
 * ============================================================
 */

export default class MatterManager {

    constructor({
        repository = null,
        eventBus = null,
        logger = null
    } = {}) {

        this.repository = repository;
        this.eventBus = eventBus;
        this.logger = logger;

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Transaction manager
        // Authorization service
        // Audit service
        // AI orchestration
        // ====================================================
    }


    async create(
        matter
    ) {

        this.ensureRepository();

        const saved =
            await this.repository.create(
                matter
            );

        await this.emit(
            "matter.created",
            saved
        );

        return saved;

    }


    async getById(
        id
    ) {

        this.ensureRepository();

        return this.repository.findById(
            id
        );

    }


    async getByReference(
        referenceNumber
    ) {

        this.ensureRepository();

        if (
            typeof this.repository
                .findByReference ===
            "function"
        ) {

            return this.repository.findByReference(
                referenceNumber
            );

        }

        return null;

    }


    async update(
        id,
        changes = {}
    ) {

        this.ensureRepository();

        const matter =
            await this.getById(id);

        if (!matter) {

            throw new Error(
                "Matter not found."
            );

        }

        Object.assign(
            matter,
            changes
        );

        if (
            typeof matter.touch ===
            "function"
        ) {

            matter.touch();

        }

        if (
            typeof matter.validate ===
            "function"
        ) {

            matter.validate();

        }

        return this.save(
            matter
        );

    }


    async changeStatus(
        id,
        status,
        metadata = {}
    ) {

        const matter =
            await this.getById(id);

        if (!matter) {

            throw new Error(
                "Matter not found."
            );

        }

        const previousStatus =
            matter.status;

        if (
            typeof matter.setStatus ===
            "function"
        ) {

            matter.setStatus(
                status
            );

        }
        else {

            matter.status =
                status;

        }

        const saved =
            await this.save(
                matter
            );

        await this.emit(
            "matter.status.changed",
            {
                matter: saved,
                previousStatus,
                status,
                metadata
            }
        );

        return saved;

    }


    async save(
        matter
    ) {

        this.ensureRepository();

        if (
            typeof this.repository
                .update ===
            "function"
        ) {

            return this.repository.update(
                matter.id,
                matter
            );

        }

        if (
            typeof this.repository
                .save ===
            "function"
        ) {

            return this.repository.save(
                matter
            );

        }

        throw new Error(
            "Matter repository does not support save/update."
        );

    }


    async delete(
        id
    ) {

        this.ensureRepository();

        const matter =
            await this.getById(id);

        if (!matter) {

            return false;

        }

        if (
            typeof this.repository
                .delete !==
            "function"
        ) {

            throw new Error(
                "Matter repository does not support deletion."
            );

        }

        const result =
            await this.repository.delete(
                id
            );

        await this.emit(
            "matter.deleted",
            {
                matter,
                result
            }
        );

        return result;

    }


    ensureRepository() {

        if (!this.repository) {

            throw new Error(
                "MatterRepository is required."
            );

        }

    }


    async emit(
        eventName,
        payload
    ) {

        if (!this.eventBus) {

            return;

        }

        if (
            typeof this.eventBus.emit ===
            "function"
        ) {

            await this.eventBus.emit(
                eventName,
                payload
            );

        }

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Bulk matter operations
    // Matter assignment
    // Matter transfer
    // Matter archival
    // Matter restoration
    // Matter locking
    // ========================================================

}
