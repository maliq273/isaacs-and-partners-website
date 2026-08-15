export default class HRSkill {
    constructor({
        knowledgeEngine = null
    } = {}) {
        this.name = "HR";
        this.knowledgeEngine =
            knowledgeEngine;
    }

    supports(service) {
        return /hr|employment|employee|disciplinary|grievance/i.test(
            String(service || "")
        );
    }

    async execute(context = {}) {
        return {
            domain: "HR",
            knowledge:
                await this.knowledgeEngine?.search?.(
                    {
                        domain: "hr",
                        service:
                            context.service
                    }
                ) || []
        };
    }
}
