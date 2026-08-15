export default class LegalSkill {
    constructor({
        knowledgeEngine = null
    } = {}) {
        this.name = "LEGAL";
        this.knowledgeEngine =
            knowledgeEngine;
    }

    supports(service) {
        return /legal|contract|affidavit|power of attorney|appeal/i.test(
            String(service || "")
        );
    }

    async execute(context = {}) {
        return {
            domain: "LEGAL",
            knowledge:
                await this.knowledgeEngine?.search?.(
                    {
                        domain:
                            "contracts",
                        service:
                            context.service
                    }
                ) || [],
            requiresHumanReview:
                true
        };
    }
}
