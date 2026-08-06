/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Document
 * ------------------------------------------------------------
 * Represents a single document belonging to a Matter.
 * ============================================================
 */

import Entity from "../domain/Entity.js";
import { DocumentStatus } from "../domain/enums/index.js";

export default class Document extends Entity {

    constructor(data = {}) {

        super(data.id);

        this.name = data.name ?? "";

        this.type = data.type ?? "";

        this.category = data.category ?? "";

        this.fileName = data.fileName ?? "";

        this.fileSize = data.fileSize ?? 0;

        this.mimeType = data.mimeType ?? "";

        this.extension = data.extension ?? "";

        this.path = data.path ?? "";

        this.status = data.status ?? DocumentStatus.REQUIRED;

        this.required = data.required ?? true;

        this.verified = data.verified ?? false;

        this.verifiedBy = data.verifiedBy ?? null;

        this.verifiedAt = data.verifiedAt ?? null;

        this.expiryDate = data.expiryDate ?? null;

        this.issueDate = data.issueDate ?? null;

        this.country = data.country ?? null;

        this.notes = [];

        this.metadata = {};

    }

    validate() {

        if (!this.name) {

            throw new Error("Document name is required.");

        }

        return true;

    }

    verify(userId) {

        this.verified = true;

        this.status = DocumentStatus.VERIFIED;

        this.verifiedBy = userId;

        this.verifiedAt = new Date().toISOString();

        this.touch();

        return this;

    }

    reject(reason = "") {

        this.verified = false;

        this.status = DocumentStatus.REJECTED;

        this.notes.push({

            timestamp: new Date().toISOString(),

            reason

        });

        this.touch();

        return this;

    }

    addNote(note) {

        this.notes.push({

            id: crypto.randomUUID(),

            note,

            createdAt: new Date().toISOString()

        });

        this.touch();

        return this;

    }

}
