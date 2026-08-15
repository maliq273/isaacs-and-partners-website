export default class NotarySkill {
    constructor({
        knowledgeEngine = null
    } = {}) {
        this.name = "NOTARY";
        this.knowledgeEngine =
            knowledgeEngine;
    }

    supports(service) {
        return /notary|notarial|certification/i.test(
            String(service || "")
        );
    }

    async execute(context = {}) {
        return {
            domain:
                "NOTARY",
            knowledge:
                await this.knowledgeEngine?.search?.(
                    {
                        domain:
                            "notary",
                        service:
                            context.service
                    }
                ) || [],
            requiresHumanReview:
                true
        };
    }
}
