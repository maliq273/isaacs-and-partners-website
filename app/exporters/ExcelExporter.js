/**
 * ExcelExporter
 * ------------------------------------------------------------
 * Excel workbook exporter.
 *
 * Primary implementation uses SheetJS when it is available
 * through:
 *
 * - globalThis.XLSX
 * - window.XLSX
 *
 * A structured SpreadsheetML fallback is provided so the
 * application can still generate an Excel-readable workbook
 * without silently failing.
 */

export class ExcelExporter {
    constructor({
        XLSX = null,
        filename = "export.xlsx"
    } = {}) {
        this.XLSX =
            XLSX ||
            globalThis?.XLSX ||
            null;

        this.filename =
            filename;
    }

    setLibrary(XLSX) {
        this.XLSX = XLSX;
        return this;
    }

    export(
        data = [],
        options = {}
    ) {
        const sheets =
            options.sheets ||
            {
                Sheet1: data
            };

        if (this.XLSX) {
            return this.exportWithSheetJS(
                sheets,
                options
            );
        }

        return this.exportSpreadsheetML(
            sheets,
            options
        );
    }

    exportWithSheetJS(
        sheets,
        options
    ) {
        const workbook =
            this.XLSX.utils.book_new();

        Object.entries(
            sheets
        ).forEach(
            ([
                sheetName,
                data
            ]) => {
                const rows =
                    this.normaliseRows(
                        data
                    );

                const worksheet =
                    this.XLSX.utils.json_to_sheet(
                        rows
                    );

                this.XLSX.utils.book_append_sheet(
                    workbook,
                    worksheet,
                    this.safeSheetName(
                        sheetName
                    )
                );
            }
        );

        const filename =
            options.filename ||
            this.filename;

        this.XLSX.writeFile(
            workbook,
            filename
        );

        return workbook;
    }

    normaliseRows(data) {
        if (!Array.isArray(data)) {
            return [
                data || {}
            ];
        }

        if (!data.length) {
            return [];
        }

        if (Array.isArray(data[0])) {
            return this.matrixToObjects(
                data
            );
        }

        return data.map((row) =>
            this.flatten(row)
        );
    }

    matrixToObjects(matrix) {
        if (!matrix.length) {
            return [];
        }

        const headers =
            matrix[0].map(
                (header, index) =>
                    String(
                        header ??
                            `Column ${index + 1}`
                    )
            );

        return matrix
            .slice(1)
            .map((row) => {
                const object = {};

                headers.forEach(
                    (
                        header,
                        index
                    ) => {
                        object[header] =
                            row[index] ??
                            "";
                    }
                );

                return object;
            });
    }

    flatten(
        object,
        prefix = "",
        result = {}
    ) {
        if (
            object == null ||
            typeof object !==
                "object" ||
            object instanceof Date
        ) {
            if (prefix) {
                result[prefix] =
                    object;
            }

            return result;
        }

        Object.entries(
            object
        ).forEach(
            ([key, value]) => {
                const path =
                    prefix
                        ? `${prefix}.${key}`
                        : key;

                if (
                    value &&
                    typeof value ===
                        "object" &&
                    !Array.isArray(
                        value
                    ) &&
                    !(
                        value instanceof
                        Date
                    )
                ) {
                    this.flatten(
                        value,
                        path,
                        result
                    );
                } else {
                    result[path] =
                        Array.isArray(
                            value
                        )
                            ? JSON.stringify(
                                  value
                              )
                            : value;
                }
            }
        );

        return result;
    }

    safeSheetName(name) {
        return String(name)
            .replace(
                /[:\\/?*\[\]]/g,
                "-"
            )
            .substring(0, 31);
    }

    exportSpreadsheetML(
        sheets,
        options
    ) {
        const xml =
            this.buildWorkbookXML(
                sheets
            );

        const filename =
            (
                options.filename ||
                this.filename
            ).replace(
                /\.xlsx$/i,
                ".xml"
            );

        const blob =
            new Blob(
                [xml],
                {
                    type:
                        "application/vnd.ms-excel;charset=utf-8"
                }
            );

        this.download(
            blob,
            filename
        );

        return xml;
    }

    buildWorkbookXML(
        sheets
    ) {
        const worksheets =
            Object.entries(
                sheets
            )
                .map(
                    ([
                        name,
                        data
                    ]) => {
                        const rows =
                            this.normaliseRows(
                                data
                            );

                        const headers =
                            rows.length
                                ? Object.keys(
                                      rows[0]
                                  )
                                : [];

                        const headerRow =
                            `<Row>${headers
                                .map(
                                    (
                                        header
                                    ) =>
                                        `<Cell><Data ss:Type="String">${this.xmlEscape(
                                            header
                                        )}</Data></Cell>`
                                )
                                .join(
                                    ""
                                )}</Row>`;

                        const body =
                            rows
                                .map(
                                    (
                                        row
                                    ) =>
                                        `<Row>${headers
                                            .map(
                                                (
                                                    header
                                                ) =>
                                                    `<Cell><Data ss:Type="String">${this.xmlEscape(
                                                        row[
                                                            header
                                                        ]
                                                    )}</Data></Cell>`
                                            )
                                            .join(
                                                ""
                                            )}</Row>`
                                )
                                .join(
                                    ""
                                );

                        return `
                            <Worksheet ss:Name="${this.xmlEscape(
                                this.safeSheetName(
                                    name
                                )
                            )}">
                                <Table>
                                    ${headerRow}
                                    ${body}
                                </Table>
                            </Worksheet>
                        `;
                    }
                )
                .join("");

        return `<?xml version="1.0"?>
            <?mso-application progid="Excel.Sheet"?>
            <Workbook
                xmlns="urn:schemas-microsoft-com:office:spreadsheet"
                xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
                ${worksheets}
            </Workbook>`;
    }

    xmlEscape(value) {
        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            );
    }

    download(blob, filename) {
        if (
            typeof document ===
            "undefined"
        ) {
            return;
        }

        const url =
            URL.createObjectURL(
                blob
            );

        const anchor =
            document.createElement(
                "a"
            );

        anchor.href = url;
        anchor.download =
            filename;

        document.body.appendChild(
            anchor
        );

        anchor.click();
        anchor.remove();

        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            1000
        );
    }
}

export default ExcelExporter;
