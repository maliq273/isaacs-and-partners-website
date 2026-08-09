/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Matter Application Module
 * ------------------------------------------------------------
 * Application-level matter operations.
 * Domain aggregate: app/models/Matter.js
 * ============================================================
 */

import MatterFactory from "./matterFactory.js";
import MatterManager from "./matterManager.js";
import MatterStatus from "./matterStatus.js";
import MatterTimeline from "./matterTimeline.js";
import MatterValidation from "./matterValidation.js";

export default class MatterApplication {

    constructor({
        matterRepository = null,
        eventBus = null,
        logger = null
    } = {}) {

        this.repository = matterRepository;
        this.eventBus = eventBus;
        this.logger = logger;

        this.factory = new MatterFactory();
        this.manager = new MatterManager({
            repository: this.repository,
            eventBus: this.eventBus,
            logger: this.logger
        });

        this.status = new MatterStatus();
        this.timeline = new MatterTimeline();
        this.validation = new MatterValidation();

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // AI matter orchestration
        // Workflow integration
        // Permission enforcement
        // Notification integration
        // Document requirements
        // ====================================================
    }


    async create(data = {}) {

        const matter =
            this.factory.create(data);

        this.validation.validate(
            matter
        );

        return this.manager.create(
            matter
        );

    }


    async getById(id) {

        return this.manager.getById(
            id
        );

    }


    async getByReference(
        referenceNumber
    ) {

        return this.manager.getByReference(
            referenceNumber
        );

    }


    async update(
        id,
        changes = {}
    ) {

        return this.manager.update(
            id,
            changes
        );

    }


    async changeStatus(
        id,
        status,
        metadata = {}
    ) {

        return this.manager.changeStatus(
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

        const matter =
            await this.manager.getById(id);

        if (!matter) {

            throw new Error(
                "Matter not found."
            );

        }

        this.timeline.add(
            matter,
            title,
            description,
            metadata
        );

        return this.manager.save(
            matter
        );

    }


    async delete(id) {

        return this.manager.delete(
            id
        );

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Matter search
    // Matter cloning
    // Matter archival
    // Matter transfer
    // Matter assignment
    // Matter AI analysis
    // ========================================================

}
