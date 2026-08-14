/**
 * DomainEvent
 * ------------------------------------------------------------
 * Base class for domain events.
 *
 * Events are immutable snapshots of something that happened
 * inside the domain.
 */

export class DomainEvent {
    constructor({
        eventName,
        aggregateId = null,
        aggregateType = null,
        payload = {},
        occurredAt = null,
        eventId = null,
        metadata = {}
    } = {}) {
        if (!eventName) {
            throw new TypeError(
                "eventName is required"
            );
        }

        this.eventId =
            eventId ||
            DomainEvent.createId();

        this.eventName =
            eventName;

        this.aggregateId =
            aggregateId;

        this.aggregateType =
            aggregateType;

        this.payload = {
            ...payload
        };

        this.occurredAt =
            occurredAt ||
            new Date().toISOString();

        this.metadata = {
            ...metadata
        };

        Object.freeze(
            this.payload
        );

        Object.freeze(
            this.metadata
        );

        Object.freeze(this);
    }

    toJSON() {
        return {
            eventId:
                this.eventId,
            eventName:
                this.eventName,
            aggregateId:
                this.aggregateId,
            aggregateType:
                this.aggregateType,
            payload:
                this.payload,
            occurredAt:
                this.occurredAt,
            metadata:
                this.metadata
        };
    }

    static createId() {
        if (
            typeof crypto !==
                "undefined" &&
            typeof crypto.randomUUID ===
                "function"
        ) {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;
    }
}

export default DomainEvent;
