/**
 * Isaacs & Partners
 * CSV Importer
 *
 * Generic CSV parsing and validation layer.
 *
 * Responsibilities:
 * - Parse CSV text/File objects.
 * - Handle quoted fields and escaped quotes.
 * - Detect headers.
 * - Normalise rows.
 * - Validate required columns.
 * - Return deterministic import data.
 *
 * Business-specific persistence belongs in the relevant
 * importer/service/repository layer.
 */

export class CSVImporter {
    constructor({
        delimiter = ",",
        quote = '"',
        logger = console
    } = {}) {
        this.delimiter = delimiter;
        this.quote = quote;
        this.logger = logger;
        this.name = "CSVImporter";
    }

    async import(source, options = {}) {
        const text =
            await this.readSource(source);

        return this.parse(text, options);
    }

    async readSource(source) {
        if (
            typeof source === "string"
        ) {
            return source;
        }

        if (
            source instanceof Blob
        ) {
            return source.text();
        }

        if (
            source &&
            typeof source.text ===
                "function"
        ) {
            return source.text();
        }

        throw new TypeError(
            "CSVImporter requires CSV text or a File/Blob"
        );
    }

    parse(text, options = {}) {
        if (
            typeof text !== "string"
        ) {
            throw new TypeError(
                "CSV content must be a string"
            );
        }

        const rows =
            this.parseRows(
                text,
                options
            );

        if (!rows.length) {
            return {
                headers: [],
                rows: [],
                count: 0,
                errors: []
            };
        }

        const hasHeader =
            options.hasHeader !== false;

        const headers = hasHeader
            ? this.normaliseHeaders(
                  rows.shift()
              )
            : this.generateHeaders(
                  rows[0]?.length || 0
              );

        const records =
            rows
                .filter((row) =>
                    row.some(
                        (value) =>
                            String(
                                value ?? ""
                            ).trim() !== ""
                    )
                )
                .map((row, index) =>
                    this.rowToObject(
                        headers,
                        row,
                        index + 2
                    )
                );

        const errors =
            this.validateHeaders(
                headers,
                options.requiredHeaders ||
                    []
            );

        return {
            headers,
            rows: records,
            count: records.length,
            errors
        };
    }

    parseRows(text, options = {}) {
        const delimiter =
            options.delimiter ||
            this.delimiter;

        const quote =
            options.quote ||
            this.quote;

        const rows = [];
        let row = [];
        let field = "";
        let inQuotes = false;

        for (
            let index = 0;
            index < text.length;
            index++
        ) {
            const char = text[index];
            const next = text[index + 1];

            if (
                char === quote
            ) {
                if (
                    inQuotes &&
                    next === quote
                ) {
                    field += quote;
                    index++;
                } else {
                    inQuotes =
                        !inQuotes;
                }

                continue;
            }

            if (
                char === delimiter &&
                !inQuotes
            ) {
                row.push(field);
                field = "";
                continue;
            }

            if (
                (char === "\n" ||
                    char === "\r") &&
                !inQuotes
            ) {
                if (
                    char === "\r" &&
                    next === "\n"
                ) {
                    index++;
                }

                row.push(field);
                rows.push(row);

                row = [];
                field = "";

                continue;
            }

            field += char;
        }

        if (
            field.length ||
            row.length
        ) {
            row.push(field);
            rows.push(row);
        }

        return rows;
    }

    normaliseHeaders(headers) {
        const used = new Map();

        return headers.map(
            (header, index) => {
                let value =
                    String(
                        header ?? ""
                    )
                        .trim()
                        .replace(/\s+/g, " ");

                if (!value) {
                    value =
                        `column_${index + 1}`;
                }

                const count =
                    used.get(value) || 0;

                used.set(
                    value,
                    count + 1
                );

                return count
                    ? `${value}_${count + 1}`
                    : value;
            }
        );
    }

    generateHeaders(count) {
        return Array.from(
            { length: count },
            (_, index) =>
                `column_${index + 1}`
        );
    }

    rowToObject(
        headers,
        row,
        rowNumber
    ) {
        const record = {
            __rowNumber: rowNumber
        };

        headers.forEach(
            (header, index) => {
                record[header] =
                    row[index] ??
                    "";
            }
        );

        return record;
    }

    validateHeaders(
        headers,
        requiredHeaders
    ) {
        const normalised =
            headers.map((header) =>
                header.toLowerCase()
            );

        return requiredHeaders
            .filter(
                (required) =>
                    !normalised.includes(
                        String(
                            required
                        ).toLowerCase()
                    )
            )
            .map((required) => ({
                type:
                    "MISSING_COLUMN",
                column: required
            }));
    }
}

export default CSVImporter;
