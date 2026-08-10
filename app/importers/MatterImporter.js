/**
 * Isaacs & Partners
 * Matter Importer
 *
 * Converts imported matter records into the canonical
 * Matter structure used by the application.
 */

export class MatterImporter {
    constructor({
        matterService = null,
        matterRepository = null,
        logger = console
    } = {}) {
        this.matterService =
            matterService;

        this.matterRepository =
            matterRepository;

        this.logger = logger;
        this.name = "MatterImporter";
    }

    async import(records = [], options = {}) {
        if (!Array.isArray(records)) {
            throw new TypeError(
                "Matter records must be an array"
            );
        }

        const results = {
            imported: [],
            skipped: [],
            errors: []
        };

        for (
            let index = 0;
            index < records.length;
            index++
        ) {
            const record =
                records[index];

            try {
                const matter =
                    this.normalise(
                        record
                    );

                this.validate(
                    matter
                );

                if (
                    options.dryRun
                ) {
                    results.imported.push(
                        matter
                    );

                    continue;
                }

                const saved =
                    await this.persist(
                        matter
                    );

                results.imported.push(
                    saved
                );
            } catch (error) {
                results.errors.push({
                    index,
                    message:
                        error?.message ||
                        "Matter import failed",
                    record
                });

                results.skipped.push(
                    record
                );

                if (
                    options.failFast
                ) {
                    throw error;
                }
            }
        }

        return results;
    }

    normalise(record = {}) {
        return {
            id:
                record.id ||
                record.matterId ||
                null,

            matterNumber:
                record.matterNumber ||
                record.matter_number ||
                null,

            title:
                record.title ||
                record.matterTitle ||
                record.name ||
                null,

            type:
                record.type ||
                record.matterType ||
                null,

            status:
                record.status ||
                "open",

            clientId:
                record.clientId ||
                record.client_id ||
                null,

            description:
                record.description ||
                null,

            priority:
                record.priority ||
                null,

            assignedTo:
                record.assignedTo ||
                record.assigned_to ||
                null,

            openedAt:
                record.openedAt ||
                record.opened_at ||
                null,

            closedAt:
                record.closedAt ||
                record.closed_at ||
                null,

            metadata: {
                source:
                    record.source ||
                    "import",

                importedAt:
                    new Date().toISOString()
            }
        };
    }

    validate(matter) {
        if (!matter.title) {
            throw new Error(
                "Matter requires a title"
            );
        }

        if (!matter.clientId) {
            throw new Error(
                "Matter requires a client reference"
            );
        }

        if (!matter.type) {
            throw new Error(
                "Matter requires a matter type"
            );
        }
    }

    async persist(matter) {
        if (
            this.matterService &&
            typeof this.matterService.create ===
                "function"
        ) {
            return this.matterService.create(
                matter
            );
        }

        if (
            this.matterRepository &&
            typeof this.matterRepository.create ===
                "function"
        ) {
            return this.matterRepository.create(
                matter
            );
        }

        throw new Error(
            "MatterImporter requires MatterService or MatterRepository"
        );
    }
}

export default MatterImporter;
