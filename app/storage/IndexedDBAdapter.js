/**
 * ============================================================
 * FILE: IndexedDBAdapter.js
 * ID: STO-007
 * LOCATION: app/storage/IndexedDBAdapter.js
 * ============================================================
 */

export default class IndexedDBAdapter {

    constructor(config = {}) {

        this.databaseName = config.database || "isaacs_db";

        this.version = config.version || 1;

        this.db = null;

    }

    /*=====================================================
        IDX-001
        Connect
    =====================================================*/

    async connect() {

        return new Promise((resolve, reject) => {

            const request = indexedDB.open(

                this.databaseName,
                this.version

            );

            request.onsuccess = () => {

                this.db = request.result;

                resolve(this.db);

            };

            request.onerror = () => {

                reject(request.error);

            };

        });

    }

    /*=====================================================
        IDX-002
        CRUD PLACEHOLDERS
    =====================================================*/

    async create(entity) {}

    async findById(id) {}

    async findAll() {}

    async update(entity) {}

    async delete(id) {}

    async exists(id) {}

    async count() {}

    async search(criteria) {}

    async filter(filters) {}

    async paginate(page, size) {}

    async sort(field, direction) {}

    /*=====================================================
        IDX-003
        Health
    =====================================================*/

    healthCheck() {

        return {

            healthy: true,

            adapter: "IndexedDB"

        };

    }

}
