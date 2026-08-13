/**
 * DocumentFactory
 * ------------------------------------------------------------
 * Creates canonical Document objects.
 *
 * Supports:
 * - uploaded documents
 * - matter documents
 * - generated documents
 * - evidence/source documents
 * - bundle documents
 */

export class DocumentFactory {
    constructor({
        Document = null,
        validator = null,
        mapper = null
    } = {}) {
        this.Document = Document;
        this.validator = validator;
        this.mapper = mapper;
    }

    create(data = {}) {
        const document =
            this.normalise(data);

        if (
            this.validator &&
            typeof this.validator.validate ===
                "function"
        ) {
            this.validator.validate(
                document
            );
        }

        if (this.Document) {
            return new this.Document(
                document
            );
        }

        return document;
    }

    fromUpload(upload = {}) {
        return this.create({
            ...upload,
            source:
                upload.source ||
                "upload"
        });
    }

    fromRecord(record = {}) {
        return this.create(
            record
        );
    }

    toPersistence(document) {
        if (
            this.mapper &&
            typeof this.mapper.toPersistence ===
                "function"
        ) {
            return this.mapper.toPersistence(
                document
            );
        }

        return {
            ...document
        };
    }

    normalise(data = {}) {
        return {
            id:
                data.id ||
                null,

            matterId:
                data.matterId ||
                data.matter_id ||
                null,

            clientId:
                data.clientId ||
                data.client_id ||
                null,

            name:
                data.name ||
                data.fileName ||
                data.filename ||
                "",

            fileName:
                data.fileName ||
                data.filename ||
                data.name ||
                "",

            type:
                data.type ||
                data.documentType ||
                "other",

            mimeType:
                data.mimeType ||
                data.mime_type ||
                null,

            size:
                data.size ??
                null,

            path:
                data.path ||
                null,

            url:
                data.url ||
                null,

            source:
                data.source ||
                "system",

            status:
                data.status ||
                "pending",

            verificationStatus:
                data.verificationStatus ||
                "unverified",

            ocrText:
                data.ocrText ||
                null,

            metadata:
                data.metadata || {}
        };
    }
}

export default DocumentFactory;
