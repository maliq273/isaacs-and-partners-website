/**
 * GenerateBundle Command
 *
 * Requests generation of a submission/printing bundle
 * for a matter.
 */

export default class GenerateBundle {
    constructor({
        matterId,
        requestedBy,
        destination = null,
        bundleType = "application",
        includeDocuments = true,
        includeChecklist = true,
        includeCoverSheet = true,
        includeOutstandingDocuments = true,
        outputFormat = "pdf",
        metadata = {},
    } = {}) {
        if (!matterId) {
            throw new Error("matterId is required");
        }

        if (!requestedBy) {
            throw new Error("requestedBy is required");
        }

        this.name = "GenerateBundle";
        this.matterId = matterId;
        this.requestedBy = requestedBy;
        this.destination = destination;
        this.bundleType = bundleType;
        this.includeDocuments = includeDocuments;
        this.includeChecklist = includeChecklist;
        this.includeCoverSheet = includeCoverSheet;
        this.includeOutstandingDocuments =
            includeOutstandingDocuments;
        this.outputFormat = outputFormat;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            matterId: this.matterId,
            requestedBy: this.requestedBy,
            destination: this.destination,
            bundleType: this.bundleType,
            includeDocuments: this.includeDocuments,
            includeChecklist: this.includeChecklist,
            includeCoverSheet: this.includeCoverSheet,
            includeOutstandingDocuments:
                this.includeOutstandingDocuments,
            outputFormat: this.outputFormat,
            metadata: this.metadata,
            timestamp: this.timestamp,
        };
    }
}
