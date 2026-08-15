export default class PassportParser {
    parse(text = "") {
        const normalized =
            String(text)
                .replace(/\r/g, "")
                .trim();

        return {
            documentType: "PASSPORT",
            passportNumber:
                this.extract(
                    normalized,
                    /(?:passport\s*(?:no|number)?\s*[:\-]?\s*)([A-Z0-9]{6,15})/i
                ),
            surname:
                this.extract(
                    normalized,
                    /surname\s*[:\-]?\s*(.+)/i
                ),
            givenNames:
                this.extract(
                    normalized,
                    /(?:given names?|first names?)\s*[:\-]?\s*(.+)/i
                ),
            rawText: normalized
        };
    }

    extract(text, pattern) {
        return (
            text.match(pattern)?.[1]
                ?.trim() || null
        );
    }
}
