/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * PipelineContext
 * ------------------------------------------------------------
 * Shared execution context passed between pipeline stages.
 * ============================================================
 */

export default class PipelineContext {

    constructor(data = {}) {

        this.id =
            data.id ??
            `pipeline_ctx_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`;

        this.input =
            data.input ?? null;

        this.output =
            data.output ?? null;

        this.data = {
            ...(data.data ?? {})
        };

        this.results = {
            ...(data.results ?? {})
        };

        this.errors = [
            ...(data.errors ?? [])
        ];

        this.warnings = [
            ...(data.warnings ?? [])
        ];

        this.metadata = {
            ...(data.metadata ?? {})
        };

        this.currentStage =
            data.currentStage ?? null;

        this.stageIndex =
            Number.isInteger(
                data.stageIndex
            )
                ? data.stageIndex
                : -1;

        this.status =
            data.status ?? "PENDING";

        this.startedAt =
            data.startedAt ?? null;

        this.completedAt =
            data.completedAt ?? null;

        this.updatedAt =
            data.updatedAt ??
            new Date().toISOString();

        // ====================================================
        // FUTURE INSERT
        //
        // User/session identity
        // Matter context
        // AI execution context
        // Trace ID
        // Correlation ID
        // Security context
        // Transaction context
        // ====================================================
    }


    set(
        key,
        value
    ) {

        this.data[key] = value;

        this.touch();

        return this;

    }


    get(
        key,
        defaultValue = null
    ) {

        return (
            Object.prototype.hasOwnProperty
                .call(
                    this.data,
                    key
                )
                ? this.data[key]
                : defaultValue
        );

    }


    has(
        key
    ) {

        return Object.prototype.hasOwnProperty
            .call(
                this.data,
                key
            );

    }


    setResult(
        stageId,
        result
    ) {

        this.results[stageId] =
            result;

        this.touch();

        return this;

    }


    getResult(
        stageId
    ) {

        return (
            this.results[stageId] ??
            null
        );

    }


    addError(
        error
    ) {

        this.errors.push(
            this.normaliseError(
                error
            )
        );

        this.status =
            "FAILED";

        this.touch();

        return this;

    }


    addWarning(
        warning
    ) {

        this.warnings.push(
            this.normaliseError(
                warning
            )
        );

        this.touch();

        return this;

    }


    normaliseError(
        error
    ) {

        if (
            error instanceof Error
        ) {

            return {

                name:
                    error.name,

                message:
                    error.message,

                stack:
                    error.stack ?? null

            };

        }

        if (
            typeof error ===
            "object" &&
            error !== null
        ) {

            return {
                ...error
            };

        }

        return {
            message:
                String(error)
        };

    }


    start() {

        this.status =
            "RUNNING";

        this.startedAt =
            new Date().toISOString();

        this.touch();

        return this;

    }


    complete(
        output = null
    ) {

        this.output =
            output;

        this.status =
            "COMPLETED";

        this.completedAt =
            new Date().toISOString();

        this.touch();

        return this;

    }


    fail(
        error
    ) {

        this.addError(
            error
        );

        this.status =
            "FAILED";

        this.completedAt =
            new Date().toISOString();

        return this;

    }


    touch() {

        this.updatedAt =
            new Date().toISOString();

        return this;

    }


    isSuccessful() {

        return (
            this.status ===
            "COMPLETED"
        );

    }


    hasFailed() {

        return (
            this.status ===
            "FAILED" ||
            this.errors.length > 0
        );

    }


    toJSON() {

        return {

            id:
                this.id,

            input:
                this.input,

            output:
                this.output,

            data: {
                ...this.data
            },

            results: {
                ...this.results
            },

            errors: [
                ...this.errors
            ],

            warnings: [
                ...this.warnings
            ],

            metadata: {
                ...this.metadata
            },

            currentStage:
                this.currentStage,

            stageIndex:
                this.stageIndex,

            status:
                this.status,

            startedAt:
                this.startedAt,

            completedAt:
                this.completedAt,

            updatedAt:
                this.updatedAt

        };

    }

}
