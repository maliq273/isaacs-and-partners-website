/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * AggregateRoot
 * ------------------------------------------------------------
 * Base class for aggregate roots.
 * Responsible for managing domain events.
 * ============================================================
 */

import Entity from "./Entity.js";

export default class AggregateRoot extends Entity {

    constructor(id = null) {

        super(id);

        this.domainEvents = [];

    }

    /**
     * Add a new domain event
     */

    addDomainEvent(event) {

        this.domainEvents.push(event);

        return this;

    }

    /**
     * Return all pending domain events
     */

    getDomainEvents() {

        return [...this.domainEvents];

    }

    /**
     * Clear pending events
     */

    clearDomainEvents() {

        this.domainEvents = [];

        return this;

    }

    /**
     * Check if events exist
     */

    hasDomainEvents() {

        return this.domainEvents.length > 0;

    }

}
