/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Client Mapper
 * ============================================================
 */

export default class ClientMapper {

    static toPersistence(client) {

        if (!client) {
            return null;
        }

        const data =
            typeof client.toJSON === "function"
                ? client.toJSON()
                : { ...client };

        return {
            ...data,
            id: client.id ?? data.id ?? null
        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Client PII field mapping
        // Passport mapping
        // Matter relationship mapping
        // CRM mapping
        // ====================================================
    }


    static fromPersistence(data) {

        if (!data) {
            return null;
        }

        return {
            ...data
        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Client model rehydration
        // PII normalization
        // Address normalization
        // Contact normalization
        // ====================================================
    }


    static toTransport(client) {

        if (!client) {
            return null;
        }

        return {
            ...this.toPersistence(client)
        };
    }


    static collection(items = []) {

        return items
            .filter(Boolean)
            .map(item =>
                this.toPersistence(item)
            );
    }

}
