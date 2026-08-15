export default class ContractParser {
    parse(text = "") {
        const value = String(text);

        return {
            documentType:
                "CONTRACT",
            parties:
                this.extractParties(
                    value
                ),
            clauses:
                this.extractClauses(
                    value
                ),
            rawText: value
        };
    }

    extractParties(text) {
        return text
            .split("\n")
            .filter(line =>
                /party|between/i.test(
                    line
                )
            )
            .slice(0, 10);
    }

    extractClauses(text) {
        return text
            .split("\n")
            .filter(line =>
                /^\s*(\d+\.|\d+\))/ .test(
                    line
                )
            );
    }
}
