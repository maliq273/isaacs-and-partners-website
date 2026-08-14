/**
 * AggregateRoot
 * ------------------------------------------------------------
 * Base class for domain aggregates.
 *
 * Responsibilities:
 * - Identity
 * - Domain event collection
 * - Event registration/release
 * - Version tracking
 * - Aggregate lifecycle metadata
 *
 * It intentionally contains no persistence logic.
 */

import Entity from "./Entity.js";

export class AggregateRoot extends Entity {
    constructor(props = {}) {
        super(props);

        this._domainEvents = [];
        this._version =
            Number.isInteger(props.version)
                ? props.version
                : 0;
    }

    get version() {
        return this._version;
    }

    incrementVersion() {
        this._version += 1;
        return this._version;
    }

    addDomainEvent(event) {
        if (!event) {
            throw new TypeError(
                "Domain event is required"
            );
        }

        this._domainEvents.push(event);
        return event;
    }

    addEvent(event) {
        return this.addDomainEvent(event);
    }

    pullDomainEvents() {
        const events = [
            ...this._domainEvents
        ];

        this._domainEvents = [];

        return events;
    }

    releaseEvents() {
        return this.pullDomainEvents();
    }

    getDomainEvents() {
        return [
            ...this._domainEvents
        ];
    }

    clearDomainEvents() {
        this._domainEvents = [];
    }

    hasDomainEvents() {
        return this._domainEvents.length > 0;
    }

    markChanged() {
        this.incrementVersion();
        return this;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            version: this.version
        };
    }
}

export default AggregateRoot;
