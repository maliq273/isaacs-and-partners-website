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
                .toLowerCase()
                .replace(/[’']/g, "'");

        const rules = [
            {
                service: "IMMIGRATION",
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
                service: "HR_IR",
                keywords: [
                    "ccma",
                    "ccma hearing",
                    "ccma case",
                    "ccma matter",
                    "commission for conciliation mediation and arbitration",
                    "conciliation",
                    "mediation",
                    "arbitration",
                    "labour dispute",
                    "labor dispute",
                    "labour law",
                    "labor law",
                    "employee",
                    "employment",
                    "disciplinary",
                    "disciplinary hearing",
                    "grievance",
                    "performance",
                    "poor performance",
                    "misconduct",
                    "dismissal",
                    "unfair dismissal",
                    "unfair labour practice",
                    "unfair labor practice",
                    "retrenchment",
                    "retrenchments",
                    "workplace dispute",
                    "employment dispute",
                    "hr",
                    "human resources",
                    "industrial relations"
                ]
            },
            {
                service: "BUSINESS_COMPLIANCE",
                keywords: [
                    "cipc",
                    "sars",
                    "uif",
                    "coida",
                    "tax",
                    "company registration",
                    "business registration",
                    "compliance"
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
                    "legal opinion",
                    "notary",
                    "notarial"
                ]
            }
        ];

        for (const rule of rules) {
            const matched = rule.keywords.filter(keyword => text.includes(keyword));
            if (matched.length) {
                return {
                    value: rule.service,
                    confidence: matched.includes("ccma") || matched.includes("ccma hearing") ? 0.98 : 0.9,
                    matched
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
