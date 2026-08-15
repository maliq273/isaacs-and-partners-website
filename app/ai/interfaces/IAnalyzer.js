export default class IAnalyzer {
    async analyze() {
        throw new Error(
            "Analyzer must implement analyze()"
        );
    }
}
