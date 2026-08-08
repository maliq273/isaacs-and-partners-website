/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Pipeline
 * ------------------------------------------------------------
 * Defines an ordered collection of executable stages.
 * ============================================================
 */

import PipelineStage
    from "./PipelineStage.js";

export default class Pipeline {

    constructor({
        id,
        name,
        stages = [],
        metadata = {}
    } = {}) {

        this.id =
            id ??
            `pipeline_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`;

        this.name =
            name ??
            this.id;

        this.stages = [];

        this.metadata = {
            ...metadata
        };

        // ====================================================
        // FUTURE INSERT
        //
        // Pipeline versioning
        // Pipeline permissions
        // Environment restrictions
        // Pipeline lifecycle
        // ====================================================

        stages.forEach(
            stage =>
                this.addStage(stage)
        );

    }


    addStage(
        stage
    ) {

        if (
            !(stage instanceof PipelineStage)
        ) {

            if (
                typeof stage ===
                "object"
            ) {

                stage =
                    new PipelineStage(
                        stage
                    );

            } else {

                throw new Error(
                    "Pipeline requires PipelineStage instances."
                );

            }

        }

        if (
            this.stages.some(
                existing =>
                    existing.id === stage.id
            )
        ) {

            throw new Error(
                `Pipeline stage "${stage.id}" already exists.`
            );

        }

        this.stages.push(
            stage
        );

        return this;

    }


    removeStage(
        stageId
    ) {

        this.stages =
            this.stages.filter(
                stage =>
                    stage.id !== stageId
            );

        return this;

    }


    getStage(
        stageId
    ) {

        return this.stages.find(
            stage =>
                stage.id === stageId
        ) ?? null;

    }


    getStages() {

        return [
            ...this.stages
        ];

    }


    getEnabledStages() {

        return this.stages.filter(
            stage =>
                stage.isEnabled()
        );

    }


    clear() {

        this.stages = [];

        return this;

    }


    get length() {

        return this.stages.length;

    }


    validate() {

        if (!this.name) {

            throw new Error(
                "Pipeline name is required."
            );

        }

        for (
            const stage
            of this.stages
        ) {

            if (
                !stage ||
                !stage.id
            ) {

                throw new Error(
                    "Pipeline contains an invalid stage."
                );

            }

        }

        return true;

    }


    clone() {

        return new Pipeline({

            id:
                `${this.id}_clone`,

            name:
                this.name,

            stages:
                this.stages.map(
                    stage =>
                        new PipelineStage({

                            id:
                                stage.id,

                            name:
                                stage.name,

                            execute:
                                stage.executeHandler,

                            validate:
                                stage.validateHandler,

                            enabled:
                                stage.enabled,

                            metadata: {
                                ...stage.metadata
                            }

                        })
                ),

            metadata: {
                ...this.metadata
            }

        });

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Conditional branching
    // Parallel stages
    // Stage dependencies
    // Pipeline composition
    // Dynamic stage insertion
    //
    // ========================================================

}
