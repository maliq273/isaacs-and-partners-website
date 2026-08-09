/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Workflow Mapper
 * ============================================================
 */

export default class WorkflowMapper {

    static toPersistence(workflow) {

        if (!workflow) {
            return null;
        }

        const data =
            typeof workflow.toJSON === "function"
                ? workflow.toJSON()
                : { ...workflow };

        return {
            ...data,
            id: workflow.id ?? data.id ?? null
        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Immigration workflow mapping
        // HR workflow mapping
        // Legal workflow mapping
        // CCMA workflow mapping
        // Workflow versioning
        // ====================================================
    }


    static fromPersistence(data) {

        if (!data) {
            return null;
        }

        return {
            ...data
        };
    }


    static toTransport(workflow) {

        if (!workflow) {
            return null;
        }

        return {
            ...this.toPersistence(workflow)
        };
    }


    static collection(items = []) {

        return items
            .filter(Boolean)
            .map(item =>
                this.toPersistence(item)
            );
    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Workflow execution state
    // Workflow audit history
    // Workflow transition mapping
    // AI planner mapping
    // ========================================================

}
