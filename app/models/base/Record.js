/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Record
 * ------------------------------------------------------------
 * Base class for lightweight records that belong to a Matter.
 * ============================================================
 */

import Entity from "../../domain/Entity.js";

export default class Record extends Entity {

    constructor(data = {}) {

        super(data.id);

        this.matterId = data.matterId ?? null;

        this.createdBy = data.createdBy ?? null;

        this.updatedBy = data.updatedBy ?? null;

        this.metadata = data.metadata ?? {};

    }

    setMatter(matterId) {

        this.matterId = matterId;

        this.touch();

        return this;

    }

    setMetadata(metadata = {}) {

        this.metadata = {

            ...this.metadata,

            ...metadata

        };

        this.touch();

        return this;

    }

}
