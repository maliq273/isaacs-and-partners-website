export default class DocumentPrompt {
    build({
        document,
        requirement,
        knowledge = []
    } = {}) {
        return {
            system: `
Analyse the supplied document against the supplied requirement.

Do not fabricate document contents.
Do not infer authenticity merely from appearance.
Identify missing, conflicting or unreadable information.
            `.trim(),

            input: {
                document,
                requirement,
                knowledge
            }
        };
    }
}
