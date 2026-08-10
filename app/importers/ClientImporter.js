/**
 * Isaacs & Partners
 * Client Importer
 *
 * Converts external client records into the application's
 * canonical client structure.
 *
 * Persistence is delegated to ClientService/ClientRepository.
 */

export class ClientImporter {
    constructor({
        clientService = null,
        clientRepository = null,
        logger = console
    } = {}) {
        this.clientService =
            clientService;

        this.clientRepository =
            clientRepository;

        this.logger = logger;
        this.name = "ClientImporter";
    }

    async import(records = [], options = {}) {
        if (!Array.isArray(records)) {
            throw new TypeError(
                "Client records must be an array"
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
                const client =
                    this.normalise(
                        record
                    );

                this.validate(
                    client
                );

                if (
                    options.dryRun
                ) {
                    results.imported.push(
                        client
                    );

                    continue;
                }

                const saved =
                    await this.persist(
                        client
                    );

                results.imported.push(
                    saved
                );
            } catch (error) {
                const entry = {
                    index,
                    record,
                    message:
                        error?.message ||
                        "Client import failed"
                };

                results.errors.push(
                    entry
                );

                if (
                    options.failFast
                ) {
                    throw error;
                }

                results.skipped.push(
                    record
                );
            }
        }

        return results;
    }

    normalise(record = {}) {
        return {
            id:
                record.id ||
                record.clientId ||
                null,

            clientNumber:
                record.clientNumber ||
                record.client_number ||
                null,

            firstName:
                this.value(
                    record.firstName,
                    record.first_name,
                    record.firstname
                ),

            lastName:
                this.value(
                    record.lastName,
                    record.last_name,
                    record.lastname
                ),

            email:
                this.value(
                    record.email,
                    record.emailAddress
                ),

            phone:
                this.value(
                    record.phone,
                    record.mobile,
                    record.telephone
                ),

            passportNumber:
                this.value(
                    record.passportNumber,
                    record.passport_number
                ),

            idNumber:
                this.value(
                    record.idNumber,
                    record.id_number,
                    record.identityNumber
                ),

            nationality:
                this.value(
                    record.nationality,
                    record.country
                ),

            address:
                this.value(
                    record.address,
                    record.residentialAddress
                ),

            notes:
                this.value(
                    record.notes,
                    record.note
                ),

            metadata: {
                source:
                    record.source ||
                    "import",
                importedAt:
                    new Date().toISOString()
            }
        };
    }

    value(...values) {
        return (
            values.find(
                (value) =>
                    value !==
                        undefined &&
                    value !== null &&
                    String(value).trim() !==
                        ""
            ) ?? null
        );
    }

    validate(client) {
        if (
            !client.firstName &&
            !client.lastName
        ) {
            throw new Error(
                "Client requires at least a first name or last name"
            );
        }

        if (
            !client.email &&
            !client.phone &&
            !client.passportNumber &&
            !client.idNumber
        ) {
            throw new Error(
                "Client requires at least one usable contact or identification field"
            );
        }
    }

    async persist(client) {
        if (
            this.clientService &&
            typeof this.clientService.create ===
                "function"
        ) {
            return this.clientService.create(
                client
            );
        }

        if (
            this.clientRepository &&
            typeof this.clientRepository.create ===
                "function"
        ) {
            return this.clientRepository.create(
                client
            );
        }

        throw new Error(
            "ClientImporter requires ClientService or ClientRepository"
        );
    }
}

export default ClientImporter;
