/**
 * PortalEngine
 * ------------------------------------------------------------
 * Client/applicant portal orchestration.
 *
 * Designed around:
 * - client authentication
 * - matter access
 * - document status
 * - appointments
 * - notifications
 *
 * Sensitive information should only be returned after the
 * authentication/authorization layer has approved access.
 */

export class PortalEngine {
    constructor({
        authenticationService = null,
        clientService = null,
        matterService = null,
        documentEngine = null,
        bookingEngine = null,
        notificationEngine = null,
        policy = null,
        logger = console
    } = {}) {
        this.authenticationService =
            authenticationService;
        this.clientService =
            clientService;
        this.matterService =
            matterService;
        this.documentEngine =
            documentEngine;
        this.bookingEngine =
            bookingEngine;
        this.notificationEngine =
            notificationEngine;
        this.policy = policy;
        this.logger = logger;
    }

    async authenticate(
        credentials,
        options = {}
    ) {
        if (
            !this.authenticationService
                ?.login
        ) {
            throw new Error(
                "AuthenticationService is required"
            );
        }

        return this.authenticationService.login(
            credentials,
            options
        );
    }

    async getDashboard(
        session,
        options = {}
    ) {
        this.assertSession(
            session
        );

        const client =
            await this.getClient(
                session,
                options
            );

        const matters =
            await this.getMatters(
                client,
                options
            );

        const dashboards =
            await Promise.all(
                matters.map(
                    async (matter) => ({
                        matter,
                        documents:
                            this.documentEngine
                                ? await this.documentEngine.getMatterDocuments(
                                      matter,
                                      options
                                  )
                                : matter.documents ||
                                  [],
                        outstanding:
                            this.documentEngine
                                ? await this.documentEngine.getOutstanding(
                                      matter,
                                      options
                                  )
                                : []
                    })
                )
            );

        return {
            client,
            matters:
                dashboards,
            generatedAt:
                new Date().toISOString()
        };
    }

    async getClient(
        session,
        options
    ) {
        if (
            session.client
        ) {
            return session.client;
        }

        if (
            this.clientService?.getById
        ) {
            return this.clientService.getById(
                session.clientId,
                options
            );
        }

        throw new Error(
            "Client service is required"
        );
    }

    async getMatters(
        client,
        options
    ) {
        if (
            this.matterService
                ?.getByClient
        ) {
            return this.matterService.getByClient(
                client.id,
                options
            );
        }

        return [];
    }

    async book(
        session,
        data,
        options = {}
    ) {
        this.assertSession(
            session
        );

        if (
            !this.bookingEngine
        ) {
            throw new Error(
                "BookingEngine is required"
            );
        }

        return this.bookingEngine.create(
            {
                ...data,
                clientId:
                    session.clientId
            },
            options
        );
    }

    assertSession(session) {
        if (
            !session ||
            !session.authenticated
        ) {
            throw new Error(
                "Authenticated portal session is required"
            );
        }
    }
}

export default PortalEngine;
