/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * PipelineExecutor
 * ------------------------------------------------------------
 * Executes pipeline stages in sequence.
 * ============================================================
 */

import PipelineContext
    from "./PipelineContext.js";

export default class PipelineExecutor {

    constructor({
        logger = null,
        eventBus = null
    } = {}) {

        this.logger =
            logger;

        this.eventBus =
            eventBus;

        // ====================================================
        // FUTURE INSERT
        //
        // Execution tracing
        // Metrics
        // Retry manager
        // Timeout manager
        // Checkpoint manager
        // Transaction manager
        // ====================================================
    }


    async execute(
        pipeline,
        input = null,
        options = {}
    ) {

        if (!pipeline) {

            throw new Error(
                "PipelineExecutor requires a pipeline."
            );

        }

        pipeline.validate();

        const context =
            options.context instanceof PipelineContext
                ? options.context
                : new PipelineContext({

                    input,

                    data:
                        options.data ?? {},

                    metadata:
                        options.metadata ?? {}

                });

        context.start();

        try {

            const stages =
                pipeline.getEnabledStages();

            for (
                let index = 0;
                index < stages.length;
                index++
            ) {

                const stage =
                    stages[index];

                context.stageIndex =
                    index;

                context.currentStage =
                    stage.id;

                context.touch();

                this.log(
                    "info",
                    `Executing pipeline stage: ${stage.name}`
                );

                const valid =
                    await stage.validate(
                        context
                    );

                if (
                    valid === false
                ) {

                    throw new Error(
                        `Pipeline stage "${stage.name}" validation failed.`
                    );

                }

                const result =
                    await stage.execute(
                        context
                    );

                context.setResult(
                    stage.id,
                    result
                );

                /**
                 * If the stage returns a PipelineContext,
                 * continue with that context.
                 */
                if (
                    result instanceof PipelineContext
                ) {

                    context.data = {
                        ...context.data,
                        ...result.data
                    };

                    context.output =
                        result.output;

                }
                /**
                 * If the stage returns an object,
                 * expose it through the context.
                 */
                else if (
                    result !== undefined
                ) {

                    context.output =
                        result;

                }

                await this.emit(
                    "pipeline.stage.completed",
                    {
                        pipeline,
                        stage,
                        context
                    }
                );

            }

            context.complete(
                context.output
            );

            await this.emit(
                "pipeline.completed",
                {
                    pipeline,
                    context
                }
            );

            return context;

        }
        catch (error) {

            context.fail(
                error
            );

            await this.emit(
                "pipeline.failed",
                {
                    pipeline,
                    context,
                    error
                }
            );

            this.log(
                "error",
                error
            );

            if (
                options.throwOnError !== false
            ) {

                throw error;

            }

            return context;

        }

    }


    async emit(
        event,
        payload
    ) {

        if (
            !this.eventBus
        ) {

            return;

        }

        if (
            typeof this.eventBus.emit ===
            "function"
        ) {

            await this.eventBus.emit(
                event,
                payload
            );

        }

    }


    log(
        level,
        message
    ) {

        if (!this.logger) {
            return;
        }

        if (
            typeof this.logger[level] ===
            "function"
        ) {

            this.logger[level](
                message
            );

        }
        else if (
            typeof this.logger.log ===
            "function"
        ) {

            this.logger.log(
                level,
                message
            );

        }

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Retry failed stage
    // Resume from checkpoint
    // Rollback pipeline
    // Parallel execution
    // Human approval gates
    // AI confidence gates
    // ========================================================

}
