export default class CCMASkill {
    constructor({
        knowledgeEngine = null
    } = {}) {
        this.name = "CCMA";
        this.knowledgeEngine =
            knowledgeEngine;
    }

    supports(service) {
        return /ccma|conciliation|arbitration/i.test(
            String(service || "")
        );
    }

    async execute(context = {}) {
        return {
            domain: "CCMA",
            knowledge:
                await this.knowledgeEngine?.search?.(
                    {
                        domain: "ccma",
                        service:
                            context.service
                    }
                ) || []
        };
    }
}
