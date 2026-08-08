/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * MatterRepository
 * ------------------------------------------------------------
 * Repository for Matter aggregate roots.
 * ============================================================
 */

import BaseRepository
    from "./BaseRepository.js";

import MatterSerializer
    from "../serializers/MatterSerializer.js";

export default class MatterRepository
    extends BaseRepository {

    constructor(options = {}) {

        super({

            ...options,

            entityName: "Matter",

            collection:
                options.collection ??
                "matters",

            serializer:
                options.serializer ??
                MatterSerializer

        });

        // ====================================================
        // FUTURE INSERT
        //
        // Matter intelligence
        // AI case analysis
        // Workflow state
        // Document bundle readiness
        // VFS/DHA destination
        // SLA monitoring
        // Matter audit history
        //
        // ====================================================
    }


    async findByReferenceNumber(
        referenceNumber
    ) {

        if (!referenceNumber) {
            return null;
        }

        return this.firstWhere({
            referenceNumber:
                String(
                    referenceNumber
                ).trim()
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


    async findByCompany(
        companyId
    ) {

        if (!companyId) {
            return [];
        }

        return this.findWhere({
            companyId
        });

    }


    async findByStatus(
        status
    ) {

        return this.findWhere({
            status
        });

    }


    async findByStage(
        stage
    ) {

        return this.findWhere({
            stage
        });

    }


    async findByDepartment(
        department
    ) {

        return this.findWhere({
            department
        });

    }


    async findAssignedTo(
        userId
    ) {

        if (!userId) {
            return [];
        }

        return this.findWhere({
            assignedTo:
                userId
        });

    }


    async findOpen() {

        const matters =
            await this.findAll();

        return matters.filter(
            matter =>
                ![
                    "CLOSED",
                    "ARCHIVED",
                    "CANCELLED"
                ].includes(
                    matter.status
                )
        );

    }


    async findOutstandingDocuments() {

        const matters =
            await this.findOpen();

        return matters.filter(
            matter =>
                Array.isArray(
                    matter.documents
                ) &&
                matter.documents.some(
                    document =>
                        document.status ===
                        "OUTSTANDING"
                )
        );

    }


    async search(
        query,
        options = {}
    ) {

        const text =
            String(query ?? "")
                .trim()
                .toLowerCase();

        const matters =
            await this.findAll(
                options
            );

        if (!text) {

            return matters;

        }

        return matters.filter(
            matter => {

                const searchable = [

                    matter.referenceNumber,

                    matter.title,

                    matter.description,

                    matter.type,

                    matter.department,

                    matter.status,

                    matter.stage,

                    matter.clientId

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


    async save(
        matter
    ) {

        if (!matter) {

            throw new Error(
                "MatterRepository.save requires a matter."
            );

        }

        if (
            typeof matter.validate ===
            "function"
        ) {

            matter.validate();

        }

        const existing =
            matter.id
                ? await this.findById(
                    matter.id
                )
                : null;

        const serialized =
            this.serialize(
                matter
            );

        if (existing) {

            return this.update(
                matter.id,
                serialized
            );

        }

        return this.create(
            serialized
        );

    }

}
