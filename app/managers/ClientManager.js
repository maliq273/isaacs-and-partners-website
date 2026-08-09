/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Client Manager
 * ============================================================
 */

export default class ClientManager {

    constructor({
        repository = null,
        clientService = null,
        eventBus = null,
        logger = null
    } = {}) {

        this.repository = repository;
        this.clientService = clientService;
        this.eventBus = eventBus;
        this.logger = logger;

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Client deduplication
        // Identity verification
        // Client portal integration
        // ====================================================
    }


    async create(
        client
    ) {

        if (
            this.clientService &&
            typeof this.clientService.create ===
            "function"
        ) {

            return this.clientService.create(
                client
            );

        }

        if (
            this.repository &&
            typeof this.repository.create ===
            "function"
        ) {

            return this.repository.create(
                client
            );

        }

        throw new Error(
            "Client service or repository is not configured."
        );

    }


    async getById(
        id
    ) {

        if (
            this.clientService &&
            typeof this.clientService.getById ===
            "function"
        ) {

            return this.clientService.getById(
                id
            );

        }

        if (
            this.repository &&
            typeof this.repository.findById ===
            "function"
        ) {

            return this.repository.findById(
                id
            );

        }

        return null;

    }


    async update(
        id,
        changes = {}
    ) {

        if (
            this.clientService &&
            typeof this.clientService.update ===
            "function"
        ) {

            return this.clientService.update(
                id,
                changes
            );

        }

        if (
            this.repository &&
            typeof this.repository.update ===
            "function"
        ) {

            return this.repository.update(
                id,
                changes
            );

        }

        throw new Error(
            "Client update provider is not configured."
        );

    }


    async delete(
        id
    ) {

        if (
            this.clientService &&
            typeof this.clientService.delete ===
            "function"
        ) {

            return this.clientService.delete(
                id
            );

        }

        if (
            this.repository &&
            typeof this.repository.delete ===
            "function"
        ) {

            return this.repository.delete(
                id
            );

        }

        throw new Error(
            "Client deletion provider is not configured."
        );

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Passport identity matching
    // Client portal
    // Client communication history
    // Client document vault
    // Client consent management
    // ========================================================

}
