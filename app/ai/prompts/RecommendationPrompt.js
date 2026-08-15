export default class RecommendationPrompt {
    build({
        findings = [],
        knowledge = []
    } = {}) {
        return {
            system: `
Generate recommendations from the supplied findings.

Recommendations are not automatically legal advice.
Identify material uncertainty and when human review is required.
            `.trim(),

            input: {
                findings,
                knowledge
            }
        };
    }
}
