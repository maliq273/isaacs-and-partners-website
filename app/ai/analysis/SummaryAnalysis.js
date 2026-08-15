export default class SummaryAnalysis {
    async analyze(input = {}) {
        return {
            type: "SUMMARY",
            summary:
                input.summary ||
                input.description ||
                "",
            source:
                input.source || null
        };
    }
}
