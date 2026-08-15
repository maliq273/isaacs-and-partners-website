export default class ServiceClassifier {
    classify(input = {}) {
        const text =
            [
                input.service,
                input.description,
                input.message
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

        const rules = [
            {
                service:
                    "IMMIGRATION",
                keywords: [
                    "visa",
                    "immigration",
                    "dha",
                    "vfs",
                    "permanent residence",
                    "citizenship",
                    "refugee",
                    "asylum"
                ]
            },
            {
                service: "HR",
                keywords: [
                    "employee",
                    "employment",
                    "disciplinary",
                    "grievance",
                    "performance",
                    "retrenchment"
                ]
            },
            {
                service:
                    "BUSINESS_COMPLIANCE",
                keywords: [
                    "cipc",
                    "sars",
                    "uif",
                    "coida",
                    "tax",
                    "company registration"
                ]
            },
            {
                service: "LEGAL",
                keywords: [
                    "contract",
                    "legal advice",
                    "affidavit",
                    "power of attorney",
                    "settlement",
                    "legal opinion"
                ]
            }
        ];

        for (const rule of rules) {
            if (
                rule.keywords.some(
                    keyword =>
                        text.includes(
                            keyword
                        )
                )
            ) {
                return {
                    value:
                        rule.service,
                    confidence: 0.85,
                    matched:
                        rule.keywords.filter(
                            keyword =>
                                text.includes(
                                    keyword
                                )
                        )
                };
            }
        }

        return {
            value: "UNKNOWN",
            confidence: 0,
            matched: []
        };
    }
}
