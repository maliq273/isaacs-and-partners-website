/**
 * AuditManager
 *
 * Coordinates audit logging, retrieval and integrity operations.
 *
 * Business modules should normally interact with the manager
 * rather than writing directly to the audit repository.
 */

import AuditLogger from "./AuditLogger.js";

export default class AuditManager {
    constructor({
        repository = null,
        query = null,
        exporter = null,
        contextProvider = null,
    } = {}) {
        this.repository = repository;
        this.query = query;
        this.exporter = exporter;

        this.logger =
            new AuditLogger({
                repository,
                contextProvider,
            });
    }

    async record(options = {}) {
        return this.logger.log(options);
    }

    async recordSuccess(options = {}) {
        return this.logger.success(
            options
        );
    }

    async recordFailure(options = {}) {
        return this.logger.failure(
            options
        );
    }

    async recordSecurityEvent(
        options = {}
    ) {
        return this.logger.security(
            options
        );
    }

    async recordAccess(options = {}) {
        return this.logger.access(
            options
        );
    }

    async getById(id) {
        if (!id) {
            throw new Error(
                "Audit entry ID is required"
            );
        }

        if (
            this.query?.findById
        ) {
            return this.query.findById(id);
        }

        if (
            this.repository?.findById
        ) {
            return this.repository.findById(id);
        }

        return null;
    }

    async search(criteria = {}) {
        if (this.query?.search) {
            return this.query.search(
                criteria
            );
        }

        if (
            this.repository?.findAll
        ) {
            return this.repository.findAll(
                criteria
            );
        }

        return [];
    }

    async getMatterHistory(
        matterId,
        options = {}
    ) {
        if (!matterId) {
            throw new Error(
                "Matter ID is required"
            );
        }

        return this.search({
            ...options,
            matterId,
        });
    }

    async getClientHistory(
        clientId,
        options = {}
    ) {
        if (!clientId) {
            throw new Error(
                "Client ID is required"
            );
        }

        return this.search({
            ...options,
            clientId,
        });
    }

    async getUserHistory(
        actorId,
        options = {}
    ) {
        if (!actorId) {
            throw new Error(
                "Actor ID is required"
            );
        }

        return this.search({
            ...options,
            actorId,
        });
    }

    async getSecurityEvents(
        options = {}
    ) {
        return this.search({
            ...options,
            eventType: "SECURITY",
        });
    }

    async getFailures(
        options = {}
    ) {
        return this.search({
            ...options,
            result: "FAILURE",
        });
    }

    async export(
        criteria = {},
        options = {}
    ) {
        if (!this.exporter) {
            throw new Error(
                "Audit exporter is not configured"
            );
        }

        const entries =
            await this.search(criteria);

        return this.exporter.export(
            entries,
            options
        );
    }
}
