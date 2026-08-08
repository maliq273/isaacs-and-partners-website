/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * WorkflowValidator
 * ============================================================
 *
 * LOCATION
 * app/validators/WorkflowValidator.js
 * ============================================================
 */

export default class WorkflowValidator {

    static validate(
        workflow = {}
    ) {

        const errors = [];

        if (!workflow) {
            return {
                valid: false,
                errors: [
                    "Workflow is required."
                ]
            };
        }

        if (!workflow.id) {
            errors.push(
                "Workflow ID is required."
            );
        }

        if (!workflow.name) {
            errors.push(
                "Workflow name is required."
            );
        }

        if (!workflow.category) {
            errors.push(
                "Workflow category is required."
            );
        }

        if (
            !Array.isArray(
                workflow.stages
            )
        ) {
            errors.push(
                "Workflow stages must be an array."
            );
        }

        if (
            !Array.isArray(
                workflow.transitions
            )
        ) {
            errors.push(
                "Workflow transitions must be an array."
            );
        }

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * Workflow schema validation
         * Stage dependency validation
         * Circular transition detection
         * Action validation
         * Rule validation
         * Permission validation
         * ====================================================
         */

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static validateStages(
        stages = []
    ) {

        const errors = [];

        const ids =
            new Set();

        stages.forEach(
            stage => {

                if (!stage.id) {

                    errors.push(
                        "Every workflow stage requires an ID."
                    );

                    return;
                }

                if (
                    ids.has(stage.id)
                ) {

                    errors.push(
                        `Duplicate workflow stage: ${stage.id}`
                    );

                }

                ids.add(
                    stage.id
                );

                if (
                    !Array.isArray(
                        stage.actions
                    )
                ) {

                    errors.push(
                        `Stage ${stage.id} must contain an actions array.`
                    );

                }

            }
        );

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static validateTransitions(
        transitions = [],
        stages = []
    ) {

        const errors = [];

        const stageIds =
            new Set(
                stages.map(
                    stage => stage.id
                )
            );

        transitions.forEach(
            transition => {

                if (
                    !transition.from ||
                    !transition.to
                ) {

                    errors.push(
                        "Every workflow transition requires from and to states."
                    );

                    return;
                }

                if (
                    stageIds.size &&
                    !stageIds.has(
                        transition.from
                    )
                ) {

                    errors.push(
                        `Unknown workflow source stage: ${transition.from}`
                    );

                }

                if (
                    stageIds.size &&
                    !stageIds.has(
                        transition.to
                    )
                ) {

                    errors.push(
                        `Unknown workflow target stage: ${transition.to}`
                    );

                }

            }
        );

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static assert(
        workflow = {}
    ) {

        const result =
            this.validate(
                workflow
            );

        if (!result.valid) {

            throw new Error(
                result.errors.join(" ")
            );

        }

        const stageResult =
            this.validateStages(
                workflow.stages || []
            );

        if (!stageResult.valid) {

            throw new Error(
                stageResult.errors.join(" ")
            );

        }

        const transitionResult =
            this.validateTransitions(
                workflow.transitions || [],
                workflow.stages || []
            );

        if (!transitionResult.valid) {

            throw new Error(
                transitionResult.errors.join(" ")
            );

        }

        return true;
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * AI-generated workflow validation
     * Immigration workflow validation
     * Appeal workflow validation
     * HR workflow validation
     * Legal workflow validation
     * Business workflow validation
     * Permission-aware transitions
     * ========================================================
     */
}
