export default class SummaryPrompt {
    build({
        matter = {},
        documents = [],
        knowledge = []
    } = {}) {
        return {
            system: `
You are an AI assistant supporting Isaacs and Partners.

Produce a factual structured summary.

Do not invent facts.
Do not treat unsupported assumptions as facts.
Identify uncertainty.
Where legal authority is required, rely on supplied authoritative sources.
            `.trim(),

            input: {
                matter,
                documents,
                knowledge
            },

            output: {
                type: "SUMMARY",
                fields: [
                    "facts",
                    "issues",
                    "documents",
                    "risks",
                    "outstandingItems",
                    "nextActions",
                    "humanReviewRequired"
                ]
            }
        };
    }
}
