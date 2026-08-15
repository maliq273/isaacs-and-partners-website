export default class PromptBuilder {
    constructor({
        prompts = {}
    } = {}) {
        this.prompts = prompts;
    }

    build(
        type,
        input = {}
    ) {
        const prompt =
            this.prompts[type];

        if (!prompt) {
            throw new Error(
                `AI prompt not registered: ${type}`
            );
        }

        return prompt.build(
            input
        );
    }
}
