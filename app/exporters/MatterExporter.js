/**
 * MatterExporter
 * ------------------------------------------------------------
 * Converts a Matter aggregate into portable export data.
 *
 * Compatible with:
 * - Matter model
 * - MatterRepository
 * - MatterSerializer
 * - ReportExporter
 * - BundleExporter
 */

export class MatterExporter {
    constructor({
        serializer = null,
        logger = console
    } = {}) {
        this.serializer =
            serializer;

        this.logger =
            logger;
    }

    prepare(matter, options = {}) {
        if (!matter) {
            throw new Error(
                "Matter is required for export"
            );
        }

        let data =
            matter;

        if (
            this.serializer &&
            typeof this.serializer.serialize ===
                "function"
        ) {
            data =
                this.serializer.serialize(
                    matter
                );
        }

        const result = {
            exportedAt:
                new Date().toISOString(),

            exportType:
                "matter",

            matter:
                this.clean(
                    data
                )
        };

        if (
            options.includeDocuments ===
            false
        ) {
            delete result.matter
                .documents;
        }

        if (
            options.includeTimeline ===
            false
        ) {
            delete result.matter
                .timeline;
        }

        if (
            options.includeCommunications ===
            false
        ) {
            delete result.matter
                .communications;
        }

        return result;
    }

    toJSON(
        matter,
        options = {}
    ) {
        return JSON.stringify(
            this.prepare(
                matter,
                options
            ),
            null,
            2
        );
    }

    createFilename(matter) {
        const number =
            matter?.matterNumber ||
            matter?.matter_number ||
            matter?.id ||
            "matter";

        return `${this.safe(
            number
        )}-export.json`;
    }

    safe(value) {
        return String(value)
            .trim()
            .replace(
                /[^a-zA-Z0-9._-]+/g,
                "-"
            );
    }

    clean(value) {
        if (
            value == null ||
            typeof value !==
                "object"
        ) {
            return value;
        }

        if (
            value instanceof Date
        ) {
            return value.toISOString();
        }

        if (Array.isArray(value)) {
            return value.map(
                (item) =>
                    this.clean(
                        item
                    )
            );
        }

        return Object.entries(
            value
        ).reduce(
            (
                result,
                [key, current]
            ) => {
                if (
                    current !==
                        undefined
                ) {
                    result[key] =
                        this.clean(
                            current
                        );
                }

                return result;
            },
            {}
        );
    }
}

export default MatterExporter;
