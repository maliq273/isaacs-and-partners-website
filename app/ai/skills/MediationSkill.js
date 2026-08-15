export default class MediationSkill {
    constructor({
        knowledgeEngine = null
    } = {}) {
        this.name =
            "MEDIATION";
        this.knowledgeEngine =
            knowledgeEngine;
    }

    supports(service) {
        return /mediation|negotiation|settlement/i.test(
            String(service || "")
        );
    }

    async execute(context = {}) {
        return {
            domain:
                "MEDIATION",
            knowledge:
                await this.knowledgeEngine?.search?.(
                    {
                        domain:
                            "mediation",
                        service:
                            context.service
                    }
                ) || []
        };
    }
}
