import AIOrchestrator from "./orchestrator/AIOrchestrator.js";
import ExecutionContext from "./orchestrator/ExecutionContext.js";

export default class AIEngine {
    constructor({
        orchestrator,
        classifiers = {},
        analyzers = {},
        planners = {},
        skills = []
    } = {}) {
        this.orchestrator =
            orchestrator;

        this.classifiers =
            classifiers;

        this.analyzers =
            analyzers;

        this.planners =
            planners;

        this.skills = skills;
    }

    async process(input = {}) {
        const context =
            new ExecutionContext({
                matter:
                    input.matter ||
                    null,
                client:
                    input.client ||
                    null,
                documents:
                    input.documents ||
                    [],
                input
            });

        return this.orchestrator.execute(
            context
        );
    }

    classify(
        type,
        input
    ) {
        const classifier =
            this.classifiers[type];

        if (!classifier) {
            throw new Error(
                `AI classifier not found: ${type}`
            );
        }

        return classifier.classify(
            input
        );
    }

    async analyze(
        type,
        input,
        context
    ) {
        const analyzer =
            this.analyzers[type];

        if (!analyzer) {
            throw new Error(
                `AI analyzer not found: ${type}`
            );
        }

        return analyzer.analyze(
            input,
            context
        );
    }

    findSkill(service) {
        return (
            this.skills.find(
                skill =>
                    skill.supports(
                        service
                    )
            ) || null
        );
    }
}
