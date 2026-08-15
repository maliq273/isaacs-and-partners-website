export default class ImmigrationSkill {
    constructor({
        knowledgeEngine = null,
        requirementEngine = null
    } = {}) {
        this.name =
            "IMMIGRATION";

        this.knowledgeEngine =
            knowledgeEngine;

        this.requirementEngine =
            requirementEngine;
    }

    supports(service) {
        return String(
            service || ""
        )
            .toLowerCase()
            .includes(
                "immigration"
            );
    }

    async execute(context = {}) {
        const knowledge =
            await this.knowledgeEngine?.search?.(
                {
                    domain:
                        "immigration",
                    service:
                        context.service
                }
            );

        const requirements =
            await this.requirementEngine?.getRequirements?.(
                context
            );

        return {
            domain:
                "IMMIGRATION",
            knowledge:
                knowledge || [],
            requirements:
                requirements || [],
            requiresHumanReview:
                true
        };
    }
}
