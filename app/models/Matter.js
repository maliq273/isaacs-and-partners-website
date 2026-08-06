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

import Document from "./Document.js";
import Note from "./Note.js";
import TimelineEntry from "./TimelineEntry.js";
import Task from "./Task.js";
import Appointment from "./Appointment.js";
import Communication from "./Communication.js";

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
    /*=====================================================
        STATUS MANAGEMENT
    =====================================================*/

    setStatus(status) {

        this.status = status;

        this.touch();

        return this;

    }

    setStage(stage) {

        this.stage = stage;

        this.touch();

        return this;

    }

    setPriority(priority) {

        this.priority = priority;

        this.touch();

        return this;

    }

    setOutcome(outcome) {

        this.outcome = outcome;

        this.touch();

        return this;

    }

    /*=====================================================
        ASSIGNMENTS
    =====================================================*/

    assignConsultant(consultantId) {

        this.consultantId = consultantId;

        this.touch();

        return this;

    }

    assignAttorney(attorneyId) {

        this.attorneyId = attorneyId;

        this.touch();

        return this;

    }

    assignUser(userId) {

        this.assignedTo = userId;

        this.touch();

        return this;

    }

    /*=====================================================
        TAGS
    =====================================================*/

    addTag(tag) {

        if (!this.tags.includes(tag)) {

            this.tags.push(tag);

            this.touch();

        }

        return this;

    }

    removeTag(tag) {

        this.tags = this.tags.filter(t => t !== tag);

        this.touch();

        return this;

    }

    /*=====================================================
        NOTES
    =====================================================*/

    addNote(note) {

        this.notes.push({

            id: crypto.randomUUID(),

            note,

            createdAt: new Date().toISOString()

        });

        this.touch();

        return this;

    }

    /*=====================================================
        TIMELINE
    =====================================================*/

    addTimelineEntry(title, description = "") {

        this.timeline.push({

            id: crypto.randomUUID(),

            title,

            description,

            timestamp: new Date().toISOString()

        });

        this.touch();

        return this;

    }

    /*=====================================================
        VALIDATION
    =====================================================*/

    validate() {

        if (!this.title) {

            throw new Error("Matter title is required.");

        }

        if (!this.type) {

            throw new Error("Matter type is required.");

        }

        if (!this.department) {

            throw new Error("Matter department is required.");

        }

        return true;

    }
    
}
