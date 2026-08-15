export default class OCRAnalysis {
    async analyze(input = {}) {
        return {
            type: "OCR",
            text:
                input.text || "",
            confidence:
                Number(
                    input.confidence ||
                    0
                ),
            blocks:
                input.blocks || []
        };
    }
}
