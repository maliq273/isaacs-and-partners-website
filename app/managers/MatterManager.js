/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Matter Manager
 * ------------------------------------------------------------
 * High-level manager for Matter lifecycle operations.
 * ============================================================
 */

import MatterApplication from "../matter/matter.js";

export default class MatterManager {

    constructor({
        repository = null,
        eventBus = null,
        logger = null
    } = {}) {

        this.repository = repository;
        this.eventBus = eventBus;
        this.logger = logger;

        this.application =
            new MatterApplication({
                matterRepository:
                    repository,
                eventBus,
                logger
            });

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // AI manager
        // Workflow manager
        // Document manager
        // Notification manager
        // ====================================================
    }


    async create(
        data = {}
    ) {

        return this.application.create(
            data
        );

    }


    async getById(
        id
    ) {

        return this.application.getById(
            id
        );

    }


    async getByReference(
        reference
    ) {

        return this.application.getByReference(
            reference
        );

    }


    async update(
        id,
        changes = {}
    ) {

        return this.application.update(
            id,
            changes
        );

    }


    async changeStatus(
        id,
        status,
        metadata = {}
    ) {

        return this.application.changeStatus(
            id,
            status,
            metadata
        );

    }


    async addTimelineEntry(
        id,
        title,
        description = "",
        metadata = {}
    ) {

        return this.application.addTimelineEntry(
            id,
            title,
            description,
            metadata
        );

    }


    async delete(
        id
    ) {

        return this.application.delete(
            id
        );

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Matter assignment
    // Matter transfer
    // Matter archival
    // Matter restoration
    // Matter AI analysis
    // Matter document completeness
    // Matter bundle generation
    // ========================================================

}
