/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * PipelineBuilder
 * ------------------------------------------------------------
 * Fluent builder for creating pipelines.
 * ============================================================
 */

import Pipeline
    from "./Pipeline.js";

import PipelineStage
    from "./PipelineStage.js";

export default class PipelineBuilder {

    constructor(options = {}) {

        this.pipeline =
            new Pipeline(
                options
            );

        // ====================================================
        // FUTURE INSERT
        //
        // Predefined pipeline templates
        // Workflow-specific builders
        // AI pipeline builders
        // Immigration pipeline builders
        // ====================================================
    }


    stage(
        options
    ) {

        const stage =
            options instanceof PipelineStage
                ? options
                : new PipelineStage(
                    options
                );

        this.pipeline.addStage(
            stage
        );

        return this;

    }


    add(
        id,
        name,
        execute,
        options = {}
    ) {

        return this.stage({

            id,

            name,

            execute,

            ...options

        });

    }


    remove(
        stageId
    ) {

        this.pipeline.removeStage(
            stageId
        );

        return this;

    }


    enable(
        stageId
    ) {

        const stage =
            this.pipeline.getStage(
                stageId
            );

        if (stage) {
            stage.enable();
        }

        return this;

    }


    disable(
        stageId
    ) {

        const stage =
            this.pipeline.getStage(
                stageId
            );

        if (stage) {
            stage.disable();
        }

        return this;

    }


    metadata(
        values = {}
    ) {

        this.pipeline.metadata = {

            ...this.pipeline.metadata,

            ...values

        };

        return this;

    }


    validate() {

        this.pipeline.validate();

        return this;

    }


    build() {

        this.pipeline.validate();

        return this.pipeline;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // .when()
    // .unless()
    // .parallel()
    // .retry()
    // .timeout()
    // .transaction()
    // .rollback()
    //
    // ========================================================

}
