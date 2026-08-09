/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Matter Mapper
 * ------------------------------------------------------------
 * Central mapper for the Matter aggregate.
 * ============================================================
 */

export default class MatterMapper {

    static toPersistence(matter) {

        if (!matter) {
            return null;
        }

        const data =
            typeof matter.toJSON === "function"
                ? matter.toJSON()
                : { ...matter };

        return {
            ...data,

            id:
                matter.id ??
                data.id ??
                null,

            referenceNumber:
                matter.referenceNumber ??
                data.referenceNumber ??
                "",

            clientId:
                matter.clientId ??
                data.clientId ??
                null,

            companyId:
                matter.companyId ??
                data.companyId ??
                null,

            consultantId:
                matter.consultantId ??
                data.consultantId ??
                null,

            attorneyId:
                matter.attorneyId ??
                data.attorneyId ??
                null,

            assignedTo:
                matter.assignedTo ??
                data.assignedTo ??
                null,

            documents:
                Array.isArray(matter.documents)
                    ? matter.documents
                    : [],

            appointments:
                Array.isArray(matter.appointments)
                    ? matter.appointments
                    : [],

            communications:
                Array.isArray(matter.communications)
                    ? matter.communications
                    : [],

            tasks:
                Array.isArray(matter.tasks)
                    ? matter.tasks
                    : [],

            notes:
                Array.isArray(matter.notes)
                    ? matter.notes
                    : [],

            timeline:
                Array.isArray(matter.timeline)
                    ? matter.timeline
                    : []

        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Immigration matter mapping
        // Visa type
        // Applicant mapping
        // VFS/DHA destination
        // Matter bundle status
        // AI analysis state
        // Compliance state
        // Workflow state
        // ====================================================
    }


    static fromPersistence(data) {

        if (!data) {
            return null;
        }

        return {
            ...data,

            documents:
                Array.isArray(data.documents)
                    ? data.documents
                    : [],

            appointments:
                Array.isArray(data.appointments)
                    ? data.appointments
                    : [],

            communications:
                Array.isArray(data.communications)
                    ? data.communications
                    : [],

            tasks:
                Array.isArray(data.tasks)
                    ? data.tasks
                    : [],

            notes:
                Array.isArray(data.notes)
                    ? data.notes
                    : [],

            timeline:
                Array.isArray(data.timeline)
                    ? data.timeline
                    : []

        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Matter aggregate rehydration
        // Nested model reconstruction
        // AI state reconstruction
        // ====================================================
    }


    static toTransport(matter) {

        if (!matter) {
            return null;
        }

        return {
            ...this.toPersistence(matter)
        };
    }


    static collection(items = []) {

        return items
            .filter(Boolean)
            .map(item =>
                this.toPersistence(item)
            );
    }


    static summary(matter) {

        if (!matter) {
            return null;
        }

        return {

            id:
                matter.id ?? null,

            referenceNumber:
                matter.referenceNumber ?? "",

            title:
                matter.title ?? "",

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

            clientId:
                matter.clientId ?? null,

            assignedTo:
                matter.assignedTo ?? null

        };
    }

}
