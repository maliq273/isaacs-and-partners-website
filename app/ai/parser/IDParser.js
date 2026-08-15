export default class IDParser {
    parse(text = "") {
        const match =
            String(text).match(
                /\b\d{13}\b/
            );

        return {
            documentType:
                "SOUTH_AFRICAN_ID",
            idNumber:
                match?.[0] || null,
            rawText: String(text)
        };
    }
}
