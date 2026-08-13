/**
 * MatterFactory
 * ------------------------------------------------------------
 * Creates the central Matter aggregate.
 *
 * Matter is intentionally kept as the central domain object
 * connecting:
 * - client
 * - documents
 * - tasks
 * - appointments
 * - communications
 * - notes
 * - timeline
 * - workflow
 */

export class MatterFactory {
    constructor({
        Matter = null,
        validator = null,
        mapper = null
    } = {}) {
        this.Matter = Matter;
        this.validator = validator;
        this.mapper = mapper;
    }

    create(data = {}) {
        const matter =
            this.normalise(data);

        if (
            this.validator &&
            typeof this.validator.validate ===
                "function"
        ) {
            this.validator.validate(
                matter
            );
        }

        if (this.Matter) {
            return new this.Matter(
                matter
            );
        }

        return matter;
    }

    createFromClient(
        client,
        data = {}
    ) {
        return this.create({
            ...data,
            clientId:
                data.clientId ||
                client?.id ||
                null
        });
    }

    fromRecord(record = {}) {
        return this.create(
            record
        );
    }

    toPersistence(matter) {
        if (
            this.mapper &&
            typeof this.mapper.toPersistence ===
                "function"
        ) {
            return this.mapper.toPersistence(
                matter
            );
        }

        return {
            ...matter
        };
    }

    normalise(data = {}) {
        return {
            id:
                data.id ||
                null,

            matterNumber:
                data.matterNumber ||
                data.matter_number ||
                null,

            title:
                data.title ||
                data.matterTitle ||
                "",

            type:
                data.type ||
                data.matterType ||
                null,

            status:
                data.status ||
                "open",

            clientId:
                data.clientId ||
                data.client_id ||
                null,

            description:
                data.description ||
                "",

            priority:
                data.priority ||
                "normal",

            assignedTo:
                data.assignedTo ||
                data.assigned_to ||
                null,

            openedAt:
                data.openedAt ||
                data.opened_at ||
                null,

            closedAt:
                data.closedAt ||
                data.closed_at ||
                null,

            documents:
                Array.isArray(
                    data.documents
                )
                    ? data.documents
                    : [],

            tasks:
                Array.isArray(
                    data.tasks
                )
                    ? data.tasks
                    : [],

            appointments:
                Array.isArray(
                    data.appointments
                )
                    ? data.appointments
                    : [],

            communications:
                Array.isArray(
                    data.communications
                )
                    ? data.communications
                    : [],

            notes:
                Array.isArray(
                    data.notes
                )
                    ? data.notes
                    : [],

            timeline:
                Array.isArray(
                    data.timeline
                )
                    ? data.timeline
                    : [],

            tags:
                Array.isArray(
                    data.tags
                )
                    ? data.tags
                    : [],

            metadata:
                data.metadata || {}
        };
    }
}

export default MatterFactory;
