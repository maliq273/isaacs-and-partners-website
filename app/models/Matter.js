/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Matter
 * ------------------------------------------------------------
 * Aggregate Root
 * Every client matter in the platform starts here.
 * ============================================================
 */

import AggregateRoot from "../domain/AggregateRoot.js";

import {
    MatterStatus,
    MatterPriority,
    MatterStage,
    MatterType,
    MatterDepartment,
    MatterSource,
    MatterVisibility,
    MatterOutcome
} from "../domain/enums/index.js";

export default class Matter extends AggregateRoot {

    constructor(data = {}) {

        super(data.id);

        /*=====================================================
            BASIC INFORMATION
        =====================================================*/

        this.referenceNumber = data.referenceNumber ?? "";

        this.title = data.title ?? "";

        this.description = data.description ?? "";

        this.type = data.type ?? MatterType.IMMIGRATION;

        this.department = data.department ?? MatterDepartment.IMMIGRATION;

        this.status = data.status ?? MatterStatus.NEW;

        this.stage = data.stage ?? MatterStage.ENQUIRY;

        this.priority = data.priority ?? MatterPriority.NORMAL;

        this.outcome = data.outcome ?? MatterOutcome.PENDING;

        this.visibility = data.visibility ?? MatterVisibility.INTERNAL;

        this.source = data.source ?? MatterSource.WEBSITE;

        /*=====================================================
            RELATIONSHIPS
        =====================================================*/

        this.clientId = data.clientId ?? null;

        this.companyId = data.companyId ?? null;

        this.consultantId = data.consultantId ?? null;

        this.attorneyId = data.attorneyId ?? null;

        this.assignedTo = data.assignedTo ?? null;

        /*=====================================================
            COLLECTIONS
        =====================================================*/

        this.documents = [];

        this.appointments = [];

        this.communications = [];

        this.tasks = [];

        this.notes = [];

        this.timeline = [];

        this.quotes = [];

        this.invoices = [];

        this.payments = [];

        this.tags = [];

        /*=====================================================
            AI
        =====================================================*/

        this.ai = {

            eligibility: null,

            riskScore: 0,

            confidence: 0,

            recommendations: [],

            workflow: null,

            summary: ""

        };

        /*=====================================================
            METADATA
        =====================================================*/

        this.metadata = {

            createdFrom: "Website",

            imported: false,

            migrated: false,

            archived: false

        };

    }

}
