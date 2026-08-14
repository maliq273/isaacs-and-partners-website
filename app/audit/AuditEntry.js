/**
 * AuditEntry
 *
 * Immutable representation of an audit event.
 *
 * Audit records should never be edited after creation.
 * Corrections must be represented by a new audit event.
 */

export default class AuditEntry {
    constructor({
        id = null,
        timestamp = null,

        actorId = null,
        actorType = "USER",

        action,
        eventType = "SYSTEM",

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

        ipAddress = null,
        userAgent = null,
        sessionId = null,

        correlationId = null,

        previousHash = null,
        hash = null,
    } = {}) {
        if (!action) {
            throw new Error(
                "Audit action is required"
            );
        }

        this.id = id;

        this.timestamp =
            timestamp ||
            new Date().toISOString();

        this.actorId = actorId;
        this.actorType = actorType;

        this.action = action;
        this.eventType = eventType;

        this.entityType = entityType;
        this.entityId = entityId;

        this.matterId = matterId;
        this.clientId = clientId;

        this.department = department;

        this.result = result;
        this.severity = severity;

        this.description = description;

        this.metadata = {
            ...metadata,
        };

        this.changes =
            changes
                ? { ...changes }
                : null;

        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.sessionId = sessionId;

        this.correlationId =
            correlationId;

        this.previousHash =
            previousHash;

        this.hash = hash;

        Object.freeze(this.metadata);

        if (this.changes) {
            Object.freeze(this.changes);
        }

        Object.freeze(this);
    }

    toJSON() {
        return {
            id: this.id,
            timestamp: this.timestamp,

            actorId: this.actorId,
            actorType: this.actorType,

            action: this.action,
            eventType: this.eventType,

            entityType: this.entityType,
            entityId: this.entityId,

            matterId: this.matterId,
            clientId: this.clientId,

            department: this.department,

            result: this.result,
            severity: this.severity,

            description: this.description,

            metadata: {
                ...this.metadata,
            },

            changes: this.changes
                ? { ...this.changes }
                : null,

            ipAddress: this.ipAddress,
            userAgent: this.userAgent,
            sessionId: this.sessionId,

            correlationId:
                this.correlationId,

            previousHash:
                this.previousHash,

            hash: this.hash,
        };
    }

    isFailure() {
        return this.result === "FAILURE";
    }

    isSecurityEvent() {
        return (
            this.eventType === "SECURITY" ||
            this.severity === "CRITICAL"
        );
    }

    isMatterEvent() {
        return Boolean(this.matterId);
    }
}
