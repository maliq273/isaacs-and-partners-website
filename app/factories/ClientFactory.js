/**
 * ClientFactory
 * ------------------------------------------------------------
 * Creates canonical Client domain objects.
 */

export class ClientFactory {
    constructor({
        Client = null,
        validator = null,
        mapper = null
    } = {}) {
        this.Client = Client;
        this.validator = validator;
        this.mapper = mapper;
    }

    create(data = {}) {
        const client =
            this.normalise(data);

        if (
            this.validator &&
            typeof this.validator.validate ===
                "function"
        ) {
            this.validator.validate(
                client
            );
        }

        if (this.Client) {
            return new this.Client(
                client
            );
        }

        return client;
    }

    fromRecord(record = {}) {
        return this.create(
            record
        );
    }

    toPersistence(client) {
        if (
            this.mapper &&
            typeof this.mapper.toPersistence ===
                "function"
        ) {
            return this.mapper.toPersistence(
                client
            );
        }

        return {
            ...client
        };
    }

    normalise(data = {}) {
        return {
            id:
                data.id ||
                null,

            clientNumber:
                data.clientNumber ||
                data.client_number ||
                null,

            firstName:
                data.firstName ||
                data.first_name ||
                "",

            lastName:
                data.lastName ||
                data.last_name ||
                "",

            email:
                data.email ||
                null,

            phone:
                data.phone ||
                data.mobile ||
                null,

            passportNumber:
                data.passportNumber ||
                data.passport_number ||
                null,

            idNumber:
                data.idNumber ||
                data.id_number ||
                null,

            nationality:
                data.nationality ||
                null,

            address:
                data.address ||
                null,

            notes:
                data.notes ||
                "",

            metadata:
                data.metadata || {}
        };
    }
}

export default ClientFactory;
