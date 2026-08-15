export default class CompletenessAnalysis {
    async analyze(input = {}) {
        const required =
            input.requiredDocuments ||
            [];

        const supplied =
            input.documents ||
            [];

        const suppliedTypes =
            new Set(
                supplied.map(
                    document =>
                        document.type
                )
            );

        const missing =
            required.filter(
                document =>
                    !suppliedTypes.has(
                        document.type ||
                        document
                    )
            );

        return {
            type: "COMPLETENESS",
            complete:
                missing.length === 0,
            required:
                required.length,
            supplied:
                supplied.length,
            missing
        };
    }
}
