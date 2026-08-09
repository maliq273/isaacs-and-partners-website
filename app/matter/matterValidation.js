/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Matter Validation
 * ------------------------------------------------------------
 * Application-level Matter validation.
 * ============================================================
 */

export default class MatterValidation {

    validate(
        matter
    ) {

        if (!matter) {

            throw new Error(
                "Matter is required."
            );

        }

        const errors =
            this.errors(
                matter
            );

        if (errors.length) {

            throw new Error(
                `Matter validation failed: ${errors.join("; ")}`
            );

        }

        return true;

    }


    isValid(
        matter
    ) {

        return (
            this.errors(
                matter
            ).length === 0
        );

    }


    errors(
        matter
    ) {

        const errors = [];

        if (!matter) {

            return [
                "Matter is required."
            ];

        }

        if (!matter.id) {

            errors.push(
                "Matter ID is required."
            );

        }

        if (!matter.title) {

            errors.push(
                "Matter title is required."
            );

        }

        if (!matter.type) {

            errors.push(
                "Matter type is required."
            );

        }

        if (!matter.department) {

            errors.push(
                "Matter department is required."
            );

        }

        if (!matter.status) {

            errors.push(
                "Matter status is required."
            );

        }

        if (!matter.stage) {

            errors.push(
                "Matter stage is required."
            );

        }

        if (
            matter.clientId ===
            undefined
        ) {

            errors.push(
                "Matter client relationship must be defined."
            );

        }

        if (
            matter.documents !== undefined &&
            !Array.isArray(
                matter.documents
            )
        ) {

            errors.push(
                "Matter documents must be an array."
            );

        }

        if (
            matter.tasks !== undefined &&
            !Array.isArray(
                matter.tasks
            )
        ) {

            errors.push(
                "Matter tasks must be an array."
            );

        }

        if (
            matter.timeline !== undefined &&
            !Array.isArray(
                matter.timeline
            )
        ) {

            errors.push(
                "Matter timeline must be an array."
            );

        }

        return errors;

    }


    validateReference(
        referenceNumber
    ) {

        if (
            referenceNumber ===
            undefined ||
            referenceNumber ===
            null
        ) {

            throw new Error(
                "Matter reference number is required."
            );

        }

        const reference =
            String(
                referenceNumber
            ).trim();

        if (!reference) {

            throw new Error(
                "Matter reference number cannot be empty."
            );

        }

        return true;

    }


    validateAssignment(
        matter
    ) {

        if (!matter) {

            throw new Error(
                "Matter is required."
            );

        }

        const assigned =
            matter.consultantId ||
            matter.attorneyId ||
            matter.assignedTo;

        if (!assigned) {

            throw new Error(
                "Matter must have an assigned responsible user."
            );

        }

        return true;

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Immigration-specific validation
    // Visa-type requirements
    // Client document completeness
    // Workflow validation
    // Financial validation
    // Conflict checks
    // Compliance validation
    // CCMA validation
    // HR/IR validation
    // ========================================================

}
