/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * PipelineStage
 * ------------------------------------------------------------
 * Represents one executable stage within a pipeline.
 * ============================================================
 */

export default class PipelineStage {

    constructor({
        id,
        name,
        execute,
        validate = null,
        enabled = true,
        metadata = {}
    } = {}) {

        this.id =
            id ??
            `stage_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`;

        this.name =
            name ??
            this.id;

        this.executeHandler =
            execute;

        this.validateHandler =
            validate;

        this.enabled =
            enabled !== false;

        this.metadata = {
            ...metadata
        };

        this.createdAt =
            new Date().toISOString();

        // ====================================================
        // FUTURE INSERT
        //
        // Stage timeout
        // Retry policy
        // Required permissions
        // Stage dependencies
        // AI confidence threshold
        // Rollback handler
        // ====================================================
    }


    isEnabled() {

        return this.enabled === true;

    }


    enable() {

        this.enabled = true;

        return this;

    }


    disable() {

        this.enabled = false;

        return this;

    }


    validate(
        context
    ) {

        if (
            typeof this.validateHandler ===
            "function"
        ) {

            return this.validateHandler(
                context,
                this
            );

        }

        return true;

    }


    async execute(
        context
    ) {

        if (!this.isEnabled()) {

            return context;

        }

        if (
            typeof this.executeHandler !==
            "function"
        ) {

            throw new Error(
                `Pipeline stage "${this.name}" has no execute handler.`
            );

        }

        return this.executeHandler(
            context,
            this
        );

    }

}
