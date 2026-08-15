export default class PayslipParser {
    parse(text = "") {
        const value = String(text);

        return {
            documentType:
                "PAYSLIP",

            employeeNumber:
                this.extract(
                    value,
                    /employee\s*(?:no|number)?\s*[:\-]?\s*([A-Z0-9\-]+)/i
                ),

            grossPay:
                this.money(
                    value,
                    /gross\s*(?:pay|salary)\s*[:\-]?\s*R?\s*([\d\s,.]+)/i
                ),

            netPay:
                this.money(
                    value,
                    /net\s*(?:pay|salary)\s*[:\-]?\s*R?\s*([\d\s,.]+)/i
                ),

            rawText: value
        };
    }

    extract(text, regex) {
        return (
            text.match(regex)?.[1]
                ?.trim() || null
        );
    }

    money(text, regex) {
        const value =
            this.extract(
                text,
                regex
            );

        if (!value) {
            return null;
        }

        return Number(
            value
                .replace(/\s/g, "")
                .replace(/,/g, "")
        );
    }
}
