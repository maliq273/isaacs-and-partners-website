export default class DecisionEngine {
    constructor({
        evaluator = null,
        validator = null,
        history = null
    } = {}) {
        this.evaluator = evaluator;
        this.validator = validator;
        this.history = history;
    }

    async evaluate(
        tree,
        input
    ) {
        let node = tree?.getRoot?.();

        while (node) {
            if (node.result) {
                const decision = {
                    result: node.result,
                    nodeId: node.id
                };

                const validation =
                    this.validator?.validate(
                        decision
                    );

                if (
                    validation &&
                    !validation.valid
                ) {
                    throw new Error(
                        validation.errors.join(
                            "; "
                        )
                    );
                }

                this.history?.add(
                    decision
                );

                return decision;
            }

            const result =
                await this.evaluator?.evaluate?.(
                    node.condition,
                    input
                );

            node = result
                ? node.trueNode
                : node.falseNode;
        }

        return {
            result: null,
            requiresHumanReview: true
        };
    }
}
