export default class PriorityClassifier {
    classify(input = {}) {
        const text =
            String(
                input.description ||
                input.message ||
                ""
            ).toLowerCase();

        if (
            /urgent|emergency|deadline today|court date|expiry/i.test(
                text
            )
        ) {
            return {
                value: "URGENT",
                confidence: 0.9
            };
        }

        if (
            /deadline|expiry|soon|hearing/i.test(
                text
            )
        ) {
            return {
                value: "HIGH",
                confidence: 0.8
            };
        }

        return {
            value:
                input.priority ||
                "NORMAL",
            confidence:
                input.priority ? 1 : 0.6
        };
    }
}
