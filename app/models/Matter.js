/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Matter
 * ------------------------------------------------------------
 * Application persistence model.
 *
 * NOTE:
 * The domain aggregate remains in:
 * app/domain/...
 *
 * This model is the persistence/application representation.
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Matter extends Record {

    constructor(data = {}) {

        super(data);

        this.referenceNumber =
            data.referenceNumber ?? "";

        this.title =
            data.title ?? "";

        this.description =
            data.description ?? "";

        this.type =
            data.type ?? "IMMIGRATION";

        this.department =
            data.department ?? "IMMIGRATION";

        this.status =
            data.status ?? "NEW";

        this.stage =
            data.stage ?? "ENQUIRY";

        this.priority =
            data.priority ?? "NORMAL";

        this.outcome =
            data.outcome ?? "PENDING";

        this.visibility =
            data.visibility ?? "INTERNAL";

        this.source =
            data.source ?? "WEBSITE";

        this.clientId =
            data.clientId ?? null;

        this.companyId =
            data.companyId ?? null;

        this.consultantId =
            data.consultantId ?? null;

        this.attorneyId =
            data.attorneyId ?? null;

        this.assignedTo =
            data.assignedTo ?? null;

        this.workflowId =
            data.workflowId ?? null;

        this.ai = {
            eligibility:
                data.ai?.eligibility ?? null,

            riskScore:
                data.ai?.riskScore ?? 0,

            confidence:
                data.ai?.confidence ?? 0,

            recommendations:
                data.ai?.recommendations ?? [],

            summary:
                data.ai?.summary ?? ""
        };

        this.tags = [
            ...(data.tags ?? [])
        ];

        this.metadata = {
            ...this.metadata,
            ...(data.metadata ?? {})
        };

        // ====================================================
        // FUTURE INSERT
        //
        // AI case intelligence
        // Immigration eligibility
        // Risk scoring
        // Document completeness
        // Automated workflows
        // VFS/DHA bundle status
        // ====================================================
    }


    setStatus(
        status
    ) {

        this.status =
            status;

        this.touch();

        return this;

    }


    setStage(
        stage
    ) {

        this.stage =
            stage;

        this.touch();

        return this;

    }


    assign(
        userId
    ) {

        this.assignedTo =
            userId;

        this.touch();

        return this;

    }


    addTag(
        tag
    ) {

        if (
            tag &&
            !this.tags.includes(tag)
        ) {

            this.tags.push(tag);

            this.touch();

        }

        return this;

    }


    removeTag(
        tag
    ) {

        this.tags =
            this.tags.filter(
                item =>
                    item !== tag
            );

        this.touch();

        return this;

    }


    validate() {

        super.validate();

        if (!this.title) {

            throw new Error(
                "Matter title is required."
            );

        }

        if (!this.type) {

            throw new Error(
                "Matter type is required."
            );

        }

        return true;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Matter lifecycle
    // AI analysis
    // Document requirements
    // Case chronology
    // Workflow orchestration
    // ========================================================

}
