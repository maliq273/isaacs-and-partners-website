/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ClientSerializer
 * ------------------------------------------------------------
 * Converts Client domain objects into safe transport objects.
 * ============================================================
 */

export default class ClientSerializer {

    static toJSON(client) {

        if (!client) {
            return null;
        }

        return {
            id: client.id ?? null,

            referenceNumber:
                client.referenceNumber ?? "",

            clientNumber:
                client.clientNumber ?? "",

            firstName:
                client.firstName ?? "",

            lastName:
                client.lastName ?? "",

            fullName:
                client.fullName ??
                [client.firstName, client.lastName]
                    .filter(Boolean)
                    .join(" "),

            email:
                client.email ?? "",

            phone:
                client.phone ?? "",

            nationality:
                client.nationality ?? null,

            country:
                client.country ?? null,

            passportNumber:
                client.passportNumber ?? null,

            idNumber:
                client.idNumber ?? null,

            dateOfBirth:
                client.dateOfBirth ?? null,

            address:
                client.address ?? null,

            status:
                client.status ?? null,

            type:
                client.type ?? null,

            assignedTo:
                client.assignedTo ?? null,

            matters:
                Array.isArray(client.matters)
                    ? client.matters.map(
                        matter =>
                            typeof matter === "object"
                                ? matter.id ?? null
                                : matter
                    )
                    : [],

            tags:
                Array.isArray(client.tags)
                    ? [...client.tags]
                    : [],

            metadata:
                client.metadata ?? {},

            createdAt:
                client.createdAt ?? null,

            updatedAt:
                client.updatedAt ?? null
        };

        // ====================================================
        // FUTURE INSERT
        //
        // Client portal fields
        // Immigration profile
        // Employer information
        // Dependants
        // Communication preferences
        // Consent records
        // CRM information
        //
        // ====================================================
    }


    static serialize(client) {

        return this.toJSON(client);

    }


    static serializeMany(clients = []) {

        return clients
            .filter(Boolean)
            .map(client =>
                this.toJSON(client)
            );

    }


    static fromJSON(data = {}) {

        return {
            ...data
        };

        // ====================================================
        // FUTURE INSERT
        // Rehydration into Client domain entity.
        // ====================================================
    }

}
