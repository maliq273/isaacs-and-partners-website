export default class BusinessSkill {
    constructor({
        knowledgeEngine = null
    } = {}) {
        this.name =
            "BUSINESS";
        this.knowledgeEngine =
            knowledgeEngine;
    }

    supports(service) {
        return [
            "business",
            "cipc",
            "sars",
            "uif",
            "coida"
        ].some(keyword =>
            String(
                service || ""
            )
                .toLowerCase()
                .includes(keyword)
        );
    }

    async execute(context = {}) {
        return {
            domain:
                "BUSINESS_COMPLIANCE",
            knowledge:
                await this.knowledgeEngine?.search?.(
                    {
                        domain:
                            "business",
                        service:
                            context.service
                    }
                ) || []
        };
    }
}
