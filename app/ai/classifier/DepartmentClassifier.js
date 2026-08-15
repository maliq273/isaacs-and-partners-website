export default class DepartmentClassifier {
    classify(input = {}) {
        const service =
            String(
                input.service ||
                input.serviceCategory ||
                ""
            ).toUpperCase();

        const map = {
            IMMIGRATION:
                "IMMIGRATION",
            HR: "HR",
            LABOUR:
                "LABOUR",
            BUSINESS_COMPLIANCE:
                "BUSINESS_COMPLIANCE",
            LEGAL:
                "LEGAL",
            MEDIATION:
                "MEDIATION",
            NOTARY:
                "NOTARY"
        };

        return {
            value:
                map[service] ||
                input.department ||
                "GENERAL",
            confidence:
                map[service] ? 1 : 0.4
        };
    }
}
