/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ClientService
 * ============================================================
 *
 * LOCATION
 * app/services/ClientService.js
 * ============================================================
 */

export default class ClientService {

    constructor({
        clientRepository = null,
        matterRepository = null,
        documentService = null,
        notificationService = null,
        logger = null
    } = {}) {

        this.clientRepository =
            clientRepository;

        this.matterRepository =
            matterRepository;

        this.documentService =
            documentService;

        this.notificationService =
            notificationService;

        this.logger =
            logger;

        /*
         * ====================================================
         * FUTURE INSERT
         * CLIENT IDENTITY VERIFICATION
         * ====================================================
         */

    }

    async createClient(data = {}) {

        if (!data.firstName && !data.name) {
            throw new Error(
                "Client name is required."
            );
        }

        if (
            this.clientRepository &&
            typeof this.clientRepository.create ===
            "function"
        ) {
            return this.clientRepository.create({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        return {
            id:
                `CLIENT-${Date.now()}`,
            ...data
        };
    }

    async getClient(clientId) {

        if (!clientId) {
            throw new Error(
                "Client ID is required."
            );
        }

        if (
            this.clientRepository &&
            typeof this.clientRepository.findById ===
            "function"
        ) {
            return this.clientRepository.findById(
                clientId
            );
        }

        return null;
    }

    async updateClient(
        clientId,
        updates = {}
    ) {

        if (
            this.clientRepository &&
            typeof this.clientRepository.update ===
            "function"
        ) {
            return this.clientRepository.update(
                clientId,
                {
                    ...updates,
                    updatedAt: new Date()
                }
            );
        }

        return {
            id: clientId,
            ...updates
        };
    }

    async deleteClient(clientId) {

        if (
            this.clientRepository &&
            typeof this.clientRepository.delete ===
            "function"
        ) {
            return this.clientRepository.delete(
                clientId
            );
        }

        return false;
    }

    async getClientMatters(clientId) {

        if (
            this.matterRepository &&
            typeof this.matterRepository.findByClientId ===
            "function"
        ) {
            return this.matterRepository.findByClientId(
                clientId
            );
        }

        return [];
    }

    async searchClients(query) {

        if (
            this.clientRepository &&
            typeof this.clientRepository.search ===
            "function"
        ) {
            return this.clientRepository.search(
                query
            );
        }

        return [];
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * Client portal
     * Passport matching
     * Matter matching
     * Duplicate detection
     * KYC
     * Communication preferences
     * WhatsApp profile
     * ========================================================
     */

}
