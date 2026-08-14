/**
 * UploadDocument Command
 *
 * Requests controlled ingestion of a document into a matter.
 */

export default class UploadDocument {
    constructor({
        matterId = null,
        clientId = null,
        uploadedBy,
        file,
        documentType = null,
        description = null,
        source = null,
        metadata = {},
    } = {}) {
        if (!uploadedBy) {
            throw new Error("uploadedBy is required");
        }

        if (!file) {
            throw new Error("file is required");
        }

        if (!matterId && !clientId) {
            throw new Error(
                "matterId or clientId is required"
            );
        }

        this.name = "UploadDocument";
        this.matterId = matterId;
        this.clientId = clientId;
        this.uploadedBy = uploadedBy;
        this.file = file;
        this.documentType = documentType;
        this.description = description;
        this.source = source;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            matterId: this.matterId,
            clientId: this.clientId,
            uploadedBy: this.uploadedBy,
            file: this.file,
            documentType: this.documentType,
            description: this.description,
            source: this.source,
            metadata: this.metadata,
            timestamp: this.timestamp,
        };
    }
}
