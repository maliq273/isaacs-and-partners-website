/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * DocumentRepository
 * ============================================================
 */

import BaseRepository
    from "./BaseRepository.js";

import DocumentSerializer
    from "../serializers/DocumentSerializer.js";

export default class DocumentRepository
    extends BaseRepository {

    constructor(options = {}) {

        super({

            ...options,

            entityName: "Document",

            collection:
                options.collection ??
                "documents",

            serializer:
                options.serializer ??
                DocumentSerializer

        });

        // ====================================================
        // FUTURE INSERT
        //
        // OCR indexing
        // AI document matching
        // Visa bundle management
        // VFS/DHA document status
        // Document versioning
        // Expiry monitoring
        //
        // ====================================================
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


    async findByClient(
        clientId
    ) {

        if (!clientId) {
            return [];
        }

        return this.findWhere({
            clientId
        });

    }


    async findByStatus(
        status
    ) {

        return this.findWhere({
            status
        });

    }


    async findByType(
        type
    ) {

        return this.findWhere({
            type
        });

    }


    async findExpiringBefore(
        date
    ) {

        const target =
            new Date(date)
                .getTime();

        const documents =
            await this.findAll();

        return documents.filter(
            document => {

                if (
                    !document.expiryDate
                ) {

                    return false;

                }

                return (
                    new Date(
                        document.expiryDate
                    ).getTime()
                    <= target
                );

            }
        );

    }


    async findOutstanding(
        matterId = null
    ) {

        const filters = {

            status:
                "OUTSTANDING"

        };

        if (matterId) {

            filters.matterId =
                matterId;

        }

        return this.findWhere(
            filters
        );

    }


    async findByChecksum(
        checksum
    ) {

        if (!checksum) {
            return null;
        }

        return this.firstWhere({
            checksum
        });

    }

}
