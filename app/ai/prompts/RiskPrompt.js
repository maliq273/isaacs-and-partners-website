export default class RiskPrompt {
    build({
        matter,
        findings = [],
        documents = []
    } = {}) {
        return {
            system: `
Identify material operational, document, compliance and case risks.

Do not invent risks unsupported by the supplied information.
Every risk should include evidence or reason.
            `.trim(),

            input: {
                matter,
                findings,
                documents
            }
        };
    }
}
