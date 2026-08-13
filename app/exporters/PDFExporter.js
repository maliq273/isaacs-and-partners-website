/**
 * PDFExporter
 * ------------------------------------------------------------
 * PDF export adapter.
 *
 * Uses jsPDF when available:
 *
 * globalThis.jspdf.jsPDF
 * OR
 * globalThis.jsPDF
 *
 * The exporter deliberately does not embed a PDF library into
 * the application. The application can provide the approved
 * production PDF library through the dependency injection layer.
 *
 * For legal/client documents, HTML templates should normally
 * be rendered through the document/template system rather than
 * treating this generic exporter as the source of legal wording.
 */

export class PDFExporter {
    constructor({
        jsPDF = null,
        filename = "document.pdf",
        logger = console
    } = {}) {
        this.jsPDF =
            jsPDF ||
            globalThis?.jspdf?.jsPDF ||
            globalThis?.jsPDF ||
            null;

        this.filename =
            filename;

        this.logger =
            logger;
    }

    setLibrary(jsPDF) {
        this.jsPDF = jsPDF;
        return this;
    }

    export(
        content,
        options = {}
    ) {
        if (!this.jsPDF) {
            throw new Error(
                "PDFExporter requires jsPDF. Register the approved PDF library before exporting."
            );
        }

        const pdf =
            new this.jsPDF(
                options.document || {}
            );

        if (
            typeof content ===
            "string"
        ) {
            this.writeText(
                pdf,
                content,
                options
            );
        } else if (
            content?.text
        ) {
            this.writeText(
                pdf,
                content.text,
                options
            );
        } else if (
            Array.isArray(
                content?.lines
            )
        ) {
            this.writeLines(
                pdf,
                content.lines,
                options
            );
        } else {
            this.writeText(
                pdf,
                JSON.stringify(
                    content,
                    null,
                    2
                ),
                options
            );
        }

        const filename =
            options.filename ||
            this.filename;

        if (
            options.download !==
            false
        ) {
            pdf.save(
                filename
            );
        }

        return pdf;
    }

    writeText(
        pdf,
        text,
        options = {}
    ) {
        const margin =
            options.margin || 20;

        const pageWidth =
            pdf.internal.pageSize
                .getWidth();

        const maxWidth =
            options.maxWidth ||
            pageWidth -
                margin * 2;

        const fontSize =
            options.fontSize ||
            10;

        pdf.setFontSize(
            fontSize
        );

        const lines =
            pdf.splitTextToSize(
                String(text),
                maxWidth
            );

        let y =
            options.startY ||
            margin;

        const lineHeight =
            options.lineHeight ||
            fontSize *
                0.5;

        lines.forEach(
            (line) => {
                if (
                    y >
                    pdf.internal
                        .pageSize
                        .getHeight() -
                        margin
                ) {
                    pdf.addPage();
                    y = margin;
                }

                pdf.text(
                    line,
                    margin,
                    y
                );

                y +=
                    lineHeight;
            }
        );

        return pdf;
    }

    writeLines(
        pdf,
        lines,
        options = {}
    ) {
        return this.writeText(
            pdf,
            lines.join("\n"),
            options
        );
    }
}

export default PDFExporter;
