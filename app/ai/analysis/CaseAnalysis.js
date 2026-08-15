export default class CaseAnalysis {
    async analyze(input = {}) {
        return {
            type: "CASE",
            matterId:
                input.matterId || null,
            service:
                input.service || null,
            department:
                input.department || null,
            issues:
                input.issues || [],
            documents:
                input.documents || [],
            nextActions:
                input.nextActions || []
        };
    }
}
