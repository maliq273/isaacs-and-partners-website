/**
 * ============================================================
 * FILE: SQLiteAdapter.js
 * ID: STO-008
 * LOCATION: app/storage/SQLiteAdapter.js
 * ============================================================
 */

export default class SQLiteAdapter {

    constructor(config = {}) {

        this.database = config.database || "isaacs.db";

        this.connected = false;

    }

    /*=====================================================
        SQL-001
        Connection
    =====================================================*/

    async connect() {

        this.connected = true;

        return true;

    }

    async disconnect() {

        this.connected = false;

    }

    /*=====================================================
        SQL-002
        CRUD
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
        SQL-003
        Transactions
    =====================================================*/

    beginTransaction() {}

    commitTransaction() {}

    rollbackTransaction() {}

}
