/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * BaseRepository
 * ------------------------------------------------------------
 * Generic repository foundation.
 *
 * All repositories should extend this class.
 * Storage is injected rather than hard-coded.
 * ============================================================
 */

export default class BaseRepository {

    constructor(options = {}) {

        this.storage =
            options.storage ?? null;

        this.serializer =
            options.serializer ?? null;

        this.entityName =
            options.entityName ?? "Entity";

        this.collection =
            options.collection ??
            this.entityName.toLowerCase();

        // ====================================================
        // FUTURE INSERT
        //
        // Repository caching
        // Transaction management
        // Audit logging
        // Permission enforcement
        // Soft-delete handling
        // Optimistic locking
        // Event publishing
        //
        // ====================================================
    }


    setStorage(storage) {

        this.storage = storage;

        return this;

    }


    setSerializer(serializer) {

        this.serializer = serializer;

        return this;

    }


    requireStorage() {

        if (!this.storage) {

            throw new Error(
                `${this.entityName}Repository requires a storage provider.`
            );

        }

        return this.storage;

    }


    serialize(entity) {

        if (!entity) {
            return null;
        }

        if (
            this.serializer &&
            typeof this.serializer.serialize ===
            "function"
        ) {

            return this.serializer.serialize(
                entity
            );

        }

        if (
            this.serializer &&
            typeof this.serializer.toJSON ===
            "function"
        ) {

            return this.serializer.toJSON(
                entity
            );

        }

        if (
            typeof entity.toJSON ===
            "function"
        ) {

            return entity.toJSON();

        }

        return {
            ...entity
        };

    }


    serializeMany(
        entities = []
    ) {

        return entities.map(
            entity =>
                this.serialize(entity)
        );

    }


    async create(
        entity
    ) {

        const storage =
            this.requireStorage();

        const data =
            this.serialize(entity);

        return storage.create(
            this.collection,
            data
        );

    }


    async findById(
        id
    ) {

        if (!id) {
            return null;
        }

        const storage =
            this.requireStorage();

        return storage.findById(
            this.collection,
            id
        );

    }


    async findAll(
        options = {}
    ) {

        const storage =
            this.requireStorage();

        return storage.findAll(
            this.collection,
            options
        );

    }


    async update(
        id,
        changes
    ) {

        if (!id) {

            throw new Error(
                `${this.entityName} update requires an id.`
            );

        }

        const storage =
            this.requireStorage();

        return storage.update(
            this.collection,
            id,
            changes
        );

    }


    async delete(
        id
    ) {

        if (!id) {

            return false;

        }

        const storage =
            this.requireStorage();

        return storage.delete(
            this.collection,
            id
        );

    }


    async exists(
        id
    ) {

        return Boolean(
            await this.findById(id)
        );

    }


    async count(
        options = {}
    ) {

        const storage =
            this.requireStorage();

        if (
            typeof storage.count ===
            "function"
        ) {

            return storage.count(
                this.collection,
                options
            );

        }

        const records =
            await this.findAll(
                options
            );

        return records.length;

    }


    async findWhere(
        filters = {},
        options = {}
    ) {

        const storage =
            this.requireStorage();

        if (
            typeof storage.findWhere ===
            "function"
        ) {

            return storage.findWhere(
                this.collection,
                filters,
                options
            );

        }

        const records =
            await this.findAll(
                options
            );

        return records.filter(
            record =>
                Object.entries(filters)
                    .every(
                        ([key, value]) =>
                            record?.[key] === value
                    )
        );

    }


    async firstWhere(
        filters = {},
        options = {}
    ) {

        const records =
            await this.findWhere(
                filters,
                {
                    ...options,
                    limit: 1
                }
            );

        return records[0] ?? null;

    }

}
