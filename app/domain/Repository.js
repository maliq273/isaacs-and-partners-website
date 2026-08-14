/**
 * Repository
 * ------------------------------------------------------------
 * Abstract repository contract.
 *
 * Concrete implementations belong in:
 * app/repositories/
 * app/storage/
 *
 * This class intentionally does not decide whether storage is
 * SQLite, IndexedDB, Supabase, memory, etc.
 */

export class Repository {
    async findById(_id) {
        throw new Error(
            "Repository.findById() must be implemented"
        );
    }

    async findAll(_criteria = {}) {
        throw new Error(
            "Repository.findAll() must be implemented"
        );
    }

    async create(_entity) {
        throw new Error(
            "Repository.create() must be implemented"
        );
    }

    async update(_id, _changes) {
        throw new Error(
            "Repository.update() must be implemented"
        );
    }

    async delete(_id) {
        throw new Error(
            "Repository.delete() must be implemented"
        );
    }

    async exists(_criteria = {}) {
        throw new Error(
            "Repository.exists() must be implemented"
        );
    }

    async count(_criteria = {}) {
        throw new Error(
            "Repository.count() must be implemented"
        );
    }
}

export default Repository;
