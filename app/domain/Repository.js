/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Repository
 * ------------------------------------------------------------
 * Abstract repository for all data persistence.
 * Every repository in the platform extends this class.
 * ============================================================
 */

export default class Repository {

    constructor(storage = null) {

        this.storage = storage;

    }

    /**
     * Find entity by ID
     */

    async findById(id) {

        throw new Error("findById() must be implemented.");

    }

    /**
     * Return all entities
     */

    async findAll() {

        throw new Error("findAll() must be implemented.");

    }

    /**
     * Save entity
     */

    async save(entity) {

        throw new Error("save() must be implemented.");

    }

    /**
     * Update entity
     */

    async update(entity) {

        throw new Error("update() must be implemented.");

    }

    /**
     * Delete entity
     */

    async delete(id) {

        throw new Error("delete() must be implemented.");

    }

    /**
     * Check existence
     */

    async exists(id) {

        throw new Error("exists() must be implemented.");

    }

}
