/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ClientRepository
 * ============================================================
 */

import BaseRepository
    from "./BaseRepository.js";

import ClientSerializer
    from "../serializers/ClientSerializer.js";

export default class ClientRepository
    extends BaseRepository {

    constructor(options = {}) {

        super({

            ...options,

            entityName: "Client",

            collection:
                options.collection ??
                "clients",

            serializer:
                options.serializer ??
                ClientSerializer

        });

        // ====================================================
        // FUTURE INSERT
        //
        // Client deduplication
        // Passport matching
        // Client portal identity
        // POPIA consent lookup
        // Client search
        //
        // ====================================================
    }


    async findByEmail(
        email
    ) {

        if (!email) {
            return null;
        }

        return this.firstWhere({
            email:
                String(email)
                    .trim()
                    .toLowerCase()
        });

    }


    async findByPassportNumber(
        passportNumber
    ) {

        if (!passportNumber) {
            return null;
        }

        return this.firstWhere({
            passportNumber:
                String(passportNumber)
                    .trim()
                    .toUpperCase()
        });

    }


    async findByReferenceNumber(
        referenceNumber
    ) {

        if (!referenceNumber) {
            return null;
        }

        return this.firstWhere({
            referenceNumber:
                String(referenceNumber)
                    .trim()
        });

    }


    async findByPhone(
        phone
    ) {

        if (!phone) {
            return null;
        }

        return this.firstWhere({
            phone:
                String(phone)
                    .trim()
        });

    }


    async findByMatter(
        matterId
    ) {

        if (!matterId) {
            return [];
        }

        return this.findWhere({
            matterId
        });

    }


    async search(
        query,
        options = {}
    ) {

        const text =
            String(query ?? "")
                .trim()
                .toLowerCase();

        if (!text) {

            return this.findAll(
                options
            );

        }

        const clients =
            await this.findAll(
                options
            );

        return clients.filter(
            client => {

                const searchable = [

                    client.firstName,

                    client.lastName,

                    client.fullName,

                    client.email,

                    client.phone,

                    client.passportNumber,

                    client.idNumber,

                    client.referenceNumber

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchable.includes(
                    text
                );

            }
        );

    }

}
