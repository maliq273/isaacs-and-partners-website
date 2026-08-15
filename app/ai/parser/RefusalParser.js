export default class RefusalParser {
    parse(text = "") {
        const value = String(text);

        return {
            documentType:
                "REFUSAL",
            reasons:
                this.extractReasons(
                    value
                ),
            deadlines:
                this.extractDates(
                    value
                ),
            rawText: value
        };
    }

    extractReasons(text) {
        return text
            .split("\n")
            .filter(line =>
                /reason|refused|rejected|failure/i.test(
                    line
                )
            );
    }

    extractDates(text) {
        return (
            text.match(
                /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g
            ) || []
        );
    }
}
