/**
 * DocumentBuilder
 *
 * Constructs document metadata consistently throughout
 * the application.
 */

export default class DocumentBuilder {
    constructor() {
        this.document = {
            id: null,
            matterId: null,
            clientId: null,
            name: null,
            filename: null,
            documentType: null,
            category: null,
            mimeType: null,
            size: null,
            status: "PENDING",
            source: "CLIENT",
            version: 1,
            metadata: {},
        };
    }

    setId(id) {
        this.document.id = id;
        return this;
    }

    setMatterId(matterId) {
        this.document.matterId = matterId;
        return this;
    }

    setClientId(clientId) {
        this.document.clientId = clientId;
        return this;
    }

    setName(name) {
        this.document.name = name;
        return this;
    }

    setFilename(filename) {
        this.document.filename = filename;
        return this;
    }

    setDocumentType(documentType) {
        this.document.documentType = documentType;
        return this;
    }

    setCategory(category) {
        this.document.category = category;
        return this;
    }

    setMimeType(mimeType) {
        this.document.mimeType = mimeType;
        return this;
    }

    setSize(size) {
        this.document.size = size;
        return this;
    }

    setStatus(status) {
        this.document.status = status;
        return this;
    }

    setSource(source) {
        this.document.source = source;
        return this;
    }

    setVersion(version) {
        this.document.version = version;
        return this;
    }

    setMetadata(metadata = {}) {
        this.document.metadata = {
            ...this.document.metadata,
            ...metadata,
        };

        return this;
    }

    build() {
        if (!this.document.name) {
            throw new Error("Document name is required");
        }

        if (!this.document.documentType) {
            throw new Error("Document type is required");
        }

        return {
            ...this.document,

            createdAt:
                this.document.createdAt ||
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString(),
        };
    }
}
