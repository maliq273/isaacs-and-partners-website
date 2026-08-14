/**
 * AuditExporter
 *
 * Converts audit records into safe export formats.
 *
 * The exporter intentionally does not expose sensitive
 * authentication information such as passwords, tokens or
 * session secrets.
 */

export default class AuditExporter {
    constructor({
        applicationName =
            "Isaacs and Partners",
    } = {}) {
        this.applicationName =
            applicationName;
    }

    export(
        entries = [],
        {
            format = "json",
            includeMetadata = true,
        } = {}
    ) {
        switch (
            String(format).toLowerCase()
        ) {
            case "json":
                return this.toJSON(
                    entries,
                    {
                        includeMetadata,
                    }
                );

            case "csv":
                return this.toCSV(
                    entries,
                    {
                        includeMetadata,
                    }
                );

            default:
                throw new Error(
                    `Unsupported audit export format: ${format}`
                );
        }
    }

    sanitise(entry) {
        const data =
            typeof entry?.toJSON ===
            "function"
                ? entry.toJSON()
                : {
                    ...entry,
                };

        const sensitiveKeys = [
            "password",
            "passwordHash",
            "token",
            "accessToken",
            "refreshToken",
            "secret",
            "apiKey",
            "privateKey",
            "authorization",
        ];

        const removeSensitive =
            object => {
                if (
                    !object ||
                    typeof object !==
                        "object"
                ) {
                    return object;
                }

                const output = {};

                Object.entries(
                    object
                ).forEach(
                    ([key, value]) => {
                        if (
                            sensitiveKeys.some(
                                sensitive =>
                                    key
                                        .toLowerCase()
                                        .includes(
                                            sensitive
                                        )
                            )
                        ) {
                            return;
                        }

                        if (
                            value &&
                            typeof value ===
                                "object" &&
                            !Array.isArray(value)
                        ) {
                            output[key] =
                                removeSensitive(
                                    value
                                );
                        } else {
                            output[key] =
                                value;
                        }
                    }
                );

                return output;
            };

        return removeSensitive(data);
    }

    toJSON(
        entries = [],
        {
            includeMetadata = true,
        } = {}
    ) {
        const records =
            entries.map(
                entry => {
                    const record =
                        this.sanitise(
                            entry
                        );

                    if (
                        !includeMetadata
                    ) {
                        delete record.metadata;
                    }

                    return record;
                }
            );

        return JSON.stringify(
            {
                application:
                    this.applicationName,

                exportedAt:
                    new Date().toISOString(),

                count:
                    records.length,

                entries: records,
            },
            null,
            2
        );
    }

    toCSV(
        entries = [],
        {
            includeMetadata = true,
        } = {}
    ) {
        const records =
            entries.map(
                entry => {
                    const record =
                        this.sanitise(
                            entry
                        );

                    if (
                        !includeMetadata
                    ) {
                        delete record.metadata;
                    }

                    return record;
                }
            );

        const columns = [
            "id",
            "timestamp",
            "actorId",
            "actorType",
            "action",
            "eventType",
            "entityType",
            "entityId",
            "matterId",
            "clientId",
            "department",
            "result",
            "severity",
            "description",
            "sessionId",
            "correlationId",
            "previousHash",
            "hash",
        ];

        const header =
            columns.join(",");

        const rows =
            records.map(
                record =>
                    columns
                        .map(
                            column =>
                                this.escapeCSV(
                                    record[
                                        column
                                    ]
                                )
                        )
                        .join(",")
            );

        return [
            header,
            ...rows,
        ].join("\n");
    }

    escapeCSV(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        const stringValue =
            String(value);

        if (
            /[",\n]/.test(
                stringValue
            )
        ) {
            return `"${stringValue.replaceAll(
                '"',
                '""'
            )}"`;
        }

        return stringValue;
    }
}
