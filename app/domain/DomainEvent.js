/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * DomainEvent
 * ------------------------------------------------------------
 * Base class for all domain events.
 * Every event in the platform inherits from this class.
 * ============================================================
 */

export default class DomainEvent {

    constructor(eventName, payload = {}) {

        this.id = crypto.randomUUID();

        this.eventName = eventName;

        this.payload = payload;

        this.timestamp = new Date().toISOString();

        this.version = 1;

    }

    /**
     * Event name
     */

    getName() {

        return this.eventName;

    }

    /**
     * Event payload
     */

    getPayload() {

        return this.payload;

    }

    /**
     * Event timestamp
     */

    getTimestamp() {

        return this.timestamp;

    }

    /**
     * Convert event to JSON
     */

    toJSON() {

        return {

            id: this.id,

            eventName: this.eventName,

            payload: this.payload,

            timestamp: this.timestamp,

            version: this.version

        };

    }

}
