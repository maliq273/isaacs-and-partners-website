/**
 * CSVExporter
 * ------------------------------------------------------------
 * Production CSV export utility.
 *
 * Designed for browser-first operation and does not require
 * a third-party package.
 *
 * Supports:
 * - arrays of objects
 * - arrays of arrays
 * - nested objects
 * - dates
 * - null/undefined values
 * - UTF-8 BOM for Excel compatibility
 */

export class CSVExporter {
    constructor({
        delimiter = ",",
        lineEnding = "\r\n",
        includeBom = true,
        filename = "export.csv"
    } = {}) {
        this.delimiter = delimiter;
        this.lineEnding = lineEnding;
        this.includeBom = includeBom;
        this.filename = filename;
    }

    export(data = [], options = {}) {
        const csv = this.toCSV(data, options);

        if (
            options.download !== false &&
            typeof window !== "undefined"
        ) {
            this.download(
                csv,
                options.filename ||
                    this.filename,
                options.mimeType ||
                    "text/csv;charset=utf-8;"
            );
        }

        return csv;
    }

    toCSV(data = [], options = {}) {
        if (!Array.isArray(data)) {
            data = [data];
        }

        if (!data.length) {
            return this.includeBom ? "\uFEFF" : "";
        }

        const rows =
            Array.isArray(data[0])
                ? this.fromMatrix(
                      data
                  )
                : this.fromObjects(
                      data,
                      options
                  );

        const content =
            rows
                .map((row) =>
                    row
                        .map((value) =>
                            this.escape(
                                value
                            )
                        )
                        .join(
                            options.delimiter ||
                                this.delimiter
                        )
                )
                .join(
                    options.lineEnding ||
                        this.lineEnding
                );

        return (
            options.includeBom ??
            this.includeBom
        )
            ? `\uFEFF${content}`
            : content;
    }

    fromMatrix(matrix) {
        return matrix.map((row) =>
            row.map((value) =>
                this.serialise(value)
            )
        );
    }

    fromObjects(
        records,
        options = {}
    ) {
        const columns =
            options.columns ||
            this.getColumns(records);

        const rows = [
            columns.map((column) =>
                options.headers?.[column] ||
                column
            )
        ];

        records.forEach((record) => {
            rows.push(
                columns.map((column) =>
                    this.serialise(
                        this.getValue(
                            record,
                            column
                        )
                    )
                )
            );
        });

        return rows;
    }

    getColumns(records) {
        const columns = new Set();

        records.forEach((record) => {
            if (
                record &&
                typeof record ===
                    "object" &&
                !Array.isArray(record)
            ) {
                Object.keys(record).forEach(
                    (key) =>
                        columns.add(key)
                );
            }
        });

        return [...columns];
    }

    getValue(object, path) {
        return String(path)
            .split(".")
            .reduce(
                (current, key) =>
                    current == null
                        ? null
                        : current[key],
                object
            );
    }

    serialise(value) {
        if (value == null) {
            return "";
        }

        if (
            value instanceof Date
        ) {
            return value.toISOString();
        }

        if (
            typeof value ===
                "object"
        ) {
            return JSON.stringify(
                value
            );
        }

        return String(value);
    }

    escape(value) {
        const string =
            this.serialise(value);

        if (
            string.includes(
                this.delimiter
            ) ||
            string.includes(
                '"'
            ) ||
            string.includes(
                "\n"
            ) ||
            string.includes(
                "\r"
            )
        ) {
            return `"${string.replace(
                /"/g,
                '""'
            )}"`;
        }

        return string;
    }

    download(
        content,
        filename,
        mimeType
    ) {
        const blob =
            new Blob(
                [content],
                {
                    type: mimeType
                }
            );

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

export default CSVExporter;
