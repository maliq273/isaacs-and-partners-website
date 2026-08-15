export default class LanguageClassifier {
    classify(text = "") {
        const value =
            String(text)
                .trim()
                .toLowerCase();

        if (!value) {
            return {
                value: "UNKNOWN",
                confidence: 0
            };
        }

        // Lightweight fallback.
        // Production language detection may be
        // supplied through an external provider.
        const patterns = [
            {
                language: "en",
                patterns: [
                    /\b(the|and|is|are|with|for)\b/
                ]
            },
            {
                language: "af",
                patterns: [
                    /\b(die|en|van|met|vir)\b/
                ]
            }
        ];

        for (const item of patterns) {
            if (
                item.patterns.some(
                    pattern =>
                        pattern.test(value)
                )
            ) {
                return {
                    value:
                        item.language,
                    confidence: 0.7
                };
            }
        }

        return {
            value: "unknown",
            confidence: 0.2
        };
    }
}
