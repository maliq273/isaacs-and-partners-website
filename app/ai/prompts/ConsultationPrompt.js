export default class ConsultationPrompt {
    build({
        answers = {},
        service = null
    } = {}) {
        return {
            system: `
Conduct a structured professional intake.

Ask only questions relevant to the selected service.
Do not assume facts that the client has not supplied.
Identify missing information required for assessment.
            `.trim(),

            input: {
                service,
                answers
            }
        };
    }
}
