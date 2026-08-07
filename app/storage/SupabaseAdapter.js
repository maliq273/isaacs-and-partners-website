/**
 * ============================================================
 * FILE: SupabaseAdapter.js
 * ID: STO-009
 * LOCATION: app/storage/SupabaseAdapter.js
 * ============================================================
 */

export default class SupabaseAdapter {

    constructor(config = {}) {

        this.client = config.client || null;

    }

    /*=====================================================
        SUP-001
        Connection
    =====================================================*/

    async connect() {

        return this.client;

    }

    /*=====================================================
        SUP-002
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
        SUP-003
        Realtime
    =====================================================*/

    subscribe() {}

    unsubscribe() {}

}
