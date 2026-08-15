export default class DocumentAnalysis {
    async analyze(input = {}) {
        const document =
            input.document || input;

        return {
            type: "DOCUMENT",
            documentType:
                document.type || null,
            filename:
                document.filename ||
                document.name ||
                null,
            verified:
                document.verified === true,
            metadata:
                document.metadata || {}
        };
    }
}
