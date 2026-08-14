/**
 * PDFBuilder
 *
 * Builds a PDF-generation specification.
 *
 * This class does not itself generate binary PDF data.
 * PDFExporter / PDF services consume the resulting specification.
 */

export default class PDFBuilder {
    constructor() {
        this.document = {
            title: null,
            author: "Isaacs and Partners",
            subject: null,

            pageSize: "A4",
            orientation: "portrait",

            margins: {
                top: 40,
                right: 40,
                bottom: 40,
                left: 40,
            },

            metadata: {},
            sections: [],
        };
    }

    setTitle(title) {
        this.document.title = title;
        return this;
    }

    setAuthor(author) {
        this.document.author = author;
        return this;
    }

    setSubject(subject) {
        this.document.subject = subject;
        return this;
    }

    setPageSize(pageSize) {
        this.document.pageSize = pageSize;
        return this;
    }

    setOrientation(orientation) {
        this.document.orientation = orientation;
        return this;
    }

    setMargins(margins = {}) {
        this.document.margins = {
            ...this.document.margins,
            ...margins,
        };

        return this;
    }

    setMetadata(metadata = {}) {
        this.document.metadata = {
            ...this.document.metadata,
            ...metadata,
        };

        return this;
    }

    addSection(section) {
        if (!section) {
            throw new Error("PDF section is required");
        }

        this.document.sections.push(section);

        return this;
    }

    addHeading(text, level = 1) {
        return this.addSection({
            type: "heading",
            level,
            text,
        });
    }

    addParagraph(text) {
        return this.addSection({
            type: "paragraph",
            text,
        });
    }

    addTable(columns, rows) {
        return this.addSection({
            type: "table",
            columns,
            rows,
        });
    }

    addPageBreak() {
        return this.addSection({
            type: "page-break",
        });
    }

    build() {
        if (!this.document.title) {
            throw new Error("PDF title is required");
        }

        return {
            ...this.document,

            sections: [...this.document.sections],

            generatedAt:
                new Date().toISOString(),
        };
    }
}
