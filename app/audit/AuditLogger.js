/**
 * AuditLogger
 *
 * Low-level audit recording service.
 *
 * The logger does not perform business operations.
 * It records what happened.
 */

import AuditEntry from "./AuditEntry.js";

export default class AuditLogger {
    constructor({
        repository = null,
        contextProvider = null,
        clock = () => new Date(),
    } = {}) {
        this.repository = repository;
        this.contextProvider =
            contextProvider;
        this.clock = clock;
    }

    async log({
        action,
        eventType = "SYSTEM",

        actorId = null,
        actorType = "USER",

        entityType = null,
        entityId = null,

        matterId = null,
        clientId = null,

        department = null,

        result = "SUCCESS",
        severity = "INFO",

        description = null,

        metadata = {},
        changes = null,

        correlationId = null,

    } = {}) {
        if (!action) {
            throw new Error(
                "Audit action is required"
            );
        }

        const context =
            await this.getContext();

        const entry =
            new AuditEntry({
                timestamp:
                    this.clock().toISOString(),

                actorId:
                    actorId ??
                    context.actorId ??
                    null,

                actorType,

                action,
                eventType,

                entityType,
                entityId,

                matterId,
                clientId,

                department,

                result,
                severity,

                description,

                metadata: {
                    ...context.metadata,
                    ...metadata,
                },

                changes,

                ipAddress:
                    context.ipAddress ||
                    null,

                userAgent:
                    context.userAgent ||
                    null,

                sessionId:
                    context.sessionId ||
                    null,

                correlationId,
            });

        if (this.repository) {
            return this.repository.create(
                entry.toJSON()
            );
        }

        return entry;
    }

    async getContext() {
        if (!this.contextProvider) {
            return {
                metadata: {},
            };
        }

        if (
            typeof this.contextProvider ===
            "function"
        ) {
            return (
                await this.contextProvider()
            ) || {
                metadata: {},
            };
        }

        return (
            this.contextProvider || {
                metadata: {},
            }
        );
    }

    async success(options = {}) {
        return this.log({
            ...options,
            result: "SUCCESS",
        });
    }

    async failure(options = {}) {
        return this.log({
            ...options,
            result: "FAILURE",
            severity:
                options.severity ||
                "ERROR",
        });
    }

    async security(options = {}) {
        return this.log({
            ...options,
            eventType: "SECURITY",
            severity:
                options.severity ||
                "WARNING",
        });
    }

    async access({
        action = "ACCESS",
        ...options
    } = {}) {
        return this.log({
            ...options,
            action,
            eventType: "ACCESS",
        });
    }
}
