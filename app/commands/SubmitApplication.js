/**
 * SubmitApplication Command
 *
 * Requests formal submission of a matter/application.
 *
 * The command itself does not bypass completeness,
 * eligibility, compliance or authorisation checks.
 */

export default class SubmitApplication {
    constructor({
        matterId,
        submittedBy,
        destination,
        submissionType = "application",
        declarationAccepted = false,
        checklistConfirmed = false,
        metadata = {},
    } = {}) {
        if (!matterId) {
            throw new Error("matterId is required");
        }

        if (!submittedBy) {
            throw new Error("submittedBy is required");
        }

        if (!destination) {
            throw new Error("destination is required");
        }

        this.name = "SubmitApplication";
        this.matterId = matterId;
        this.submittedBy = submittedBy;
        this.destination = destination;
        this.submissionType = submissionType;
        this.declarationAccepted =
            Boolean(declarationAccepted);
        this.checklistConfirmed =
            Boolean(checklistConfirmed);
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            matterId: this.matterId,
            submittedBy: this.submittedBy,
            destination: this.destination,
            submissionType: this.submissionType,
            declarationAccepted:
                this.declarationAccepted,
            checklistConfirmed:
                this.checklistConfirmed,
            metadata: this.metadata,
            timestamp: this.timestamp,
        };
    }
}
