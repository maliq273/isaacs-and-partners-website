/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Matter
 * ------------------------------------------------------------
 * Aggregate Root
 * Every client matter in the platform starts here.
 * ============================================================
 */
import CaseAnalysis from "../ai/analysis/CaseAnalysis.js";
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

    analyse() {

        this.ai = CaseAnalysis.analyse(this);

        this.touch();

        return this.ai;

    }

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
        TYPED COLLECTIONS
        =====================================================*/

        this.documents = [];        // Document[]
        this.appointments = [];     // Appointment[]
        this.communications = [];   // Communication[]
        this.tasks = [];            // Task[]
        this.notes = [];            // Note[]
        this.timeline = [];         // TimelineEntry[]

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
        TASKS
    =====================================================*/

    addTask(task) {

        if (!(task instanceof Task)) {

            throw new Error("Expected Task instance.");

        }

        task.setMatter(this.id);

        this.tasks.push(task);

        this.touch();

        return this;

    }

    getOpenTasks() {

        return this.tasks.filter(

            t => !t.completed

        );

    }

    /*=====================================================
        APPOINTMENTS
    =====================================================*/

    scheduleAppointment(appointment) {

        if (!(appointment instanceof Appointment)) {

            throw new Error("Expected Appointment instance.");

        }

        appointment.setMatter(this.id);

        this.appointments.push(appointment);

        this.touch();

        return this;

    }

    getUpcomingAppointments() {

        return this.appointments;

    }

    /*=====================================================
        COMMUNICATIONS
    =====================================================*/

    addCommunication(communication) {

        if (!(communication instanceof Communication)) {

            throw new Error("Expected Communication instance.");

        }

        communication.setMatter(this.id);

        this.communications.push(communication);

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

        if (!(note instanceof Note)) {

            throw new Error("Expected Note instance.");

        }

        note.setMatter(this.id);

        note.validate();

        this.notes.push(note);

        this.touch();

        return this;

    }

    removeNote(noteId) {

        this.notes = this.notes.filter(

            n => n.id !== noteId

        );

        this.touch();

        return this;

    }

    /*=====================================================
    TIMELINE
    =====================================================*/

    addTimelineEntry(title, description = "") {

        const entry = new TimelineEntry({

            matterId: this.id,

            title,

            description

        });

        this.timeline.push(entry);

        this.touch();

        return entry;

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
    /*=====================================================
    DOCUMENT MANAGEMENT
    =====================================================*/

    addDocument(document) {

        if (!(document instanceof Document)) {

            throw new Error("Expected Document instance.");

        }

        document.setMatter(this.id);

        document.validate();

        const exists = this.documents.some(d => d.id === document.id);

        if (exists) {

            throw new Error("Document already exists.");

        }

        this.documents.push(document);

        this.addTimelineEntry(
            "Document Added",
            document.name
        );

        this.touch();

        return this;

    }

    removeDocument(documentId) {

        this.documents = this.documents.filter(

            d => d.id !== documentId

        );

        this.touch();

        return this;

    }

    getDocument(documentId) {

        return this.documents.find(

            d => d.id === documentId

        );

    }

    getDocumentsByStatus(status) {

        return this.documents.filter(

            d => d.status === status

        );

    }
    
}
