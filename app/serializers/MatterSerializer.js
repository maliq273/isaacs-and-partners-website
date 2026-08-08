/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * MatterSerializer
 * ------------------------------------------------------------
 * Converts Matter aggregate roots into transport objects.
 * ============================================================
 */

import DocumentSerializer
    from "./DocumentSerializer.js";

export default class MatterSerializer {

    static toJSON(
        matter,
        options = {}
    ) {

        if (!matter) {
            return null;
        }

        const includeDocuments =
            options.includeDocuments ?? true;

        const includeTimeline =
            options.includeTimeline ?? true;

        const includeTasks =
            options.includeTasks ?? true;

        const includeAppointments =
            options.includeAppointments ?? true;

        const includeCommunications =
            options.includeCommunications ?? false;

        const includeNotes =
            options.includeNotes ?? false;


        const result = {

            id:
                matter.id ?? null,

            referenceNumber:
                matter.referenceNumber ?? "",

            title:
                matter.title ?? "",

            description:
                matter.description ?? "",

            type:
                matter.type ?? null,

            department:
                matter.department ?? null,

            status:
                matter.status ?? null,

            stage:
                matter.stage ?? null,

            priority:
                matter.priority ?? null,

            outcome:
                matter.outcome ?? null,

            visibility:
                matter.visibility ?? null,

            source:
                matter.source ?? null,


            clientId:
                matter.clientId ?? null,

            companyId:
                matter.companyId ?? null,

            consultantId:
                matter.consultantId ?? null,

            attorneyId:
                matter.attorneyId ?? null,

            assignedTo:
                matter.assignedTo ?? null,


            tags:
                Array.isArray(matter.tags)
                    ? [...matter.tags]
                    : [],


            ai:
                matter.ai
                    ? {
                        eligibility:
                            matter.ai.eligibility ?? null,

                        riskScore:
                            matter.ai.riskScore ?? 0,

                        confidence:
                            matter.ai.confidence ?? 0,

                        recommendations:
                            Array.isArray(
                                matter.ai.recommendations
                            )
                                ? [
                                    ...matter.ai.recommendations
                                ]
                                : [],

                        workflow:
                            matter.ai.workflow ?? null,

                        summary:
                            matter.ai.summary ?? ""
                    }
                    : null,


            metadata:
                matter.metadata ?? {},


            createdAt:
                matter.createdAt ?? null,

            updatedAt:
                matter.updatedAt ?? null

        };


        if (includeDocuments) {

            result.documents =
                DocumentSerializer.serializeMany(
                    matter.documents ?? []
                );

        }


        if (includeTimeline) {

            result.timeline =
                Array.isArray(matter.timeline)
                    ? matter.timeline.map(
                        entry => ({
                            ...entry
                        })
                    )
                    : [];

        }


        if (includeTasks) {

            result.tasks =
                Array.isArray(matter.tasks)
                    ? matter.tasks.map(
                        task => ({
                            ...task
                        })
                    )
                    : [];

        }


        if (includeAppointments) {

            result.appointments =
                Array.isArray(
                    matter.appointments
                )
                    ? matter.appointments.map(
                        appointment => ({
                            ...appointment
                        })
                    )
                    : [];

        }


        if (includeCommunications) {

            result.communications =
                Array.isArray(
                    matter.communications
                )
                    ? matter.communications.map(
                        communication => ({
                            ...communication
                        })
                    )
                    : [];

        }


        if (includeNotes) {

            result.notes =
                Array.isArray(matter.notes)
                    ? matter.notes.map(
                        note => ({
                            ...note
                        })
                    )
                    : [];

        }


        return result;

        // ====================================================
        // FUTURE INSERT
        //
        // Matter intelligence
        // AI case analysis
        // Eligibility result
        // Risk assessment
        // Knowledge requirements
        // Workflow state
        // SLA information
        // Outstanding documents
        // Bundle readiness
        // VFS/DHA destination
        //
        // ====================================================
    }


    static serialize(
        matter,
        options = {}
    ) {

        return this.toJSON(
            matter,
            options
        );

    }


    static serializeMany(
        matters = [],
        options = {}
    ) {

        return matters
            .filter(Boolean)
            .map(
                matter =>
                    this.toJSON(
                        matter,
                        options
                    )
            );

    }


    static fromJSON(
        data = {}
    ) {

        return {
            ...data
        };

        // ====================================================
        // FUTURE INSERT
        // Matter aggregate rehydration.
        // ====================================================
    }

}
