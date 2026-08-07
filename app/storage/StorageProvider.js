/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ============================================================
 *
 * FILE
 * StorageProvider.js
 *
 * FILE ID
 * STO-001
 *
 * LAYER
 * Storage
 *
 * RESPONSIBILITY
 * Central gateway between repositories and storage adapters.
 *
 * LOCATION
 * app/storage/StorageProvider.js
 *
 * USED BY
 * BaseRepository
 * MatterRepository
 * ClientRepository
 * DocumentRepository
 * BookingRepository
 * KnowledgeRepository
 *
 * VERSION
 * 1.0.0
 *
 * ============================================================
 * FUTURE EXPANSION MAP
 * ============================================================
 *
 * ✔ Provider Registration
 * ✔ Active Provider
 * ✔ CRUD Delegation
 *
 * □ Transactions
 * □ Encryption
 * □ Synchronisation
 * □ Backup
 * □ Restore
 * □ Read Replicas
 * □ Metrics
 * □ Health Monitoring
 * □ Offline Queue
 * □ Multi-Tenant Routing
 * ============================================================
 */

export default class StorageProvider {

    /*=====================================================
        STO-001
        Constructor
    =====================================================*/

    constructor() {

        this.provider = null;

    }

    /*=====================================================
        STO-002
        Provider Registration
    =====================================================*/

    register(provider) {

        this.provider = provider;

        return this;

    }

    /*=====================================================
        STO-003
        Active Provider
    =====================================================*/

    getProvider() {

        return this.provider;

    }

    hasProvider() {

        return this.provider !== null;

    }

    ensureProvider() {

        if (!this.provider) {

            throw new Error(
                "No storage provider has been registered."
            );

        }

    }

    /*=====================================================
        STO-004
        CRUD Delegation
    =====================================================*/

    async create(entity) {

        this.ensureProvider();

        return this.provider.create(entity);

    }

    async findById(id) {

        this.ensureProvider();

        return this.provider.findById(id);

    }

    async findAll() {

        this.ensureProvider();

        return this.provider.findAll();

    }

    async update(entity) {

        this.ensureProvider();

        return this.provider.update(entity);

    }

    async delete(id) {

        this.ensureProvider();

        return this.provider.delete(id);

    }

    async exists(id) {

        this.ensureProvider();

        return this.provider.exists(id);

    }

    async count() {

        this.ensureProvider();

        return this.provider.count();

    }

    async search(criteria = {}) {

        this.ensureProvider();

        return this.provider.search(criteria);

    }

    async filter(filters = {}) {

        this.ensureProvider();

        return this.provider.filter(filters);

    }

    async paginate(page = 1, pageSize = 20) {

        this.ensureProvider();

        return this.provider.paginate(page, pageSize);

    }

    async sort(field, direction = "asc") {

        this.ensureProvider();

        return this.provider.sort(field, direction);

    }

    /*=====================================================
        STO-005
        Provider Information
    =====================================================*/

    getProviderName() {

        if (!this.provider) {

            return "None";

        }

        return this.provider.constructor.name;

    }

    /*=====================================================
        STO-006
        Health
    =====================================================*/

    healthCheck() {

        return {

            healthy: this.hasProvider(),

            provider: this.getProviderName(),

            timestamp: new Date()

        };

    }

    /*=====================================================
        STO-007
        Transactions
        Reserved
    =====================================================*/

    beginTransaction() {}

    commitTransaction() {}

    rollbackTransaction() {}

    /*=====================================================
        STO-008
        Backup & Restore
        Reserved
    =====================================================*/

    backup() {}

    restore() {}

    /*=====================================================
        STO-009
        Synchronisation
        Reserved
    =====================================================*/

    synchronise() {}

    /*=====================================================
        STO-010
        Encryption
        Reserved
    =====================================================*/

    encrypt() {}

    decrypt() {}

    /*=====================================================
        STO-011
        Performance Metrics
        Reserved
    =====================================================*/

    metrics() {}

    /*=====================================================
        STO-012
        Multi-Tenant Routing
        Reserved
    =====================================================*/

    selectTenant() {}

}
