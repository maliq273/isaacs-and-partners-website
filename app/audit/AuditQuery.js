/**
 * AuditQuery
 *
 * Builds structured audit searches.
 *
 * Supports:
 * - user history
 * - matter history
 * - client history
 * - action searches
 * - security events
 * - date ranges
 * - failures
 * - severity
 */

export default class AuditQuery {
    constructor({
        repository = null,
    } = {}) {
        this.repository = repository;
    }

    async findById(id) {
        if (!id) {
            return null;
        }

        return this.repository?.findById
            ? this.repository.findById(id)
            : null;
    }

    async search(criteria = {}) {
        if (!this.repository) {
            return [];
        }

        if (
            typeof this.repository.search ===
            "function"
        ) {
            return this.repository.search(
                this.buildCriteria(criteria)
            );
        }

        if (
            typeof this.repository.findAll ===
            "function"
        ) {
            return this.repository.findAll(
                this.buildCriteria(criteria)
            );
        }

        return [];
    }

    buildCriteria(criteria = {}) {
        const result = {};

        const allowedFields = [
            "actorId",
            "actorType",

            "action",
            "eventType",

            "entityType",
            "entityId",

            "matterId",
            "clientId",

            "department",

            "result",
            "severity",

            "sessionId",
            "correlationId",
        ];

        allowedFields.forEach(field => {
            if (
                criteria[field] !== undefined &&
                criteria[field] !== null &&
                criteria[field] !== ""
            ) {
                result[field] =
                    criteria[field];
            }
        });

        if (criteria.from) {
            result.from =
                criteria.from;
        }

        if (criteria.to) {
            result.to =
                criteria.to;
        }

        if (criteria.search) {
            result.search =
                criteria.search;
        }

        result.orderBy =
            criteria.orderBy ||
            "timestamp";

        result.orderDirection =
            criteria.orderDirection ||
            "DESC";

        result.limit =
            Number.isInteger(
                criteria.limit
            )
                ? criteria.limit
                : 100;

        result.offset =
            Number.isInteger(
                criteria.offset
            )
                ? criteria.offset
                : 0;

        return result;
    }

    async byMatter(
        matterId,
        options = {}
    ) {
        return this.search({
            ...options,
            matterId,
        });
    }

    async byClient(
        clientId,
        options = {}
    ) {
        return this.search({
            ...options,
            clientId,
        });
    }

    async byActor(
        actorId,
        options = {}
    ) {
        return this.search({
            ...options,
            actorId,
        });
    }

    async byAction(
        action,
        options = {}
    ) {
        return this.search({
            ...options,
            action,
        });
    }

    async securityEvents(
        options = {}
    ) {
        return this.search({
            ...options,
            eventType: "SECURITY",
        });
    }

    async failures(
        options = {}
    ) {
        return this.search({
            ...options,
            result: "FAILURE",
        });
    }
}
