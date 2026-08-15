export default class CVParser {
    parse(text = "") {
        return {
            documentType: "CV",
            rawText: String(text),
            sections:
                this.detectSections(text)
        };
    }

    detectSections(text) {
        const sections = [
            "PROFILE",
            "EXPERIENCE",
            "EDUCATION",
            "SKILLS",
            "REFERENCES"
        ];

        return sections.filter(
            section =>
                new RegExp(
                    `\\b${section}\\b`,
                    "i"
                ).test(text)
        );
    }
}
