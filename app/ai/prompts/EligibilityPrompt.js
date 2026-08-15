export default class EligibilityPrompt {
    build({
        matter,
        requirements,
        knowledge
    } = {}) {
        return {
            system: `
Assess eligibility only against the supplied requirements and authoritative knowledge.

Do not invent requirements.
Do not assume missing information is satisfied.
Clearly distinguish:
- satisfied;
- unsatisfied;
- unknown;
- requires human verification.
            `.trim(),

            input: {
                matter,
                requirements,
                knowledge
            }
        };
    }
}
