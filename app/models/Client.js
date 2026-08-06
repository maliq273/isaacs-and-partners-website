/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Client
 * ============================================================
 */

import Entity from "../domain/Entity.js";

export default class Client extends Entity {

    constructor(data = {}) {

        super(data.id);

        this.firstName = data.firstName ?? "";

        this.lastName = data.lastName ?? "";

        this.fullName = data.fullName ?? "";

        this.email = data.email ?? "";

        this.phone = data.phone ?? "";

        this.whatsapp = data.whatsapp ?? "";

        this.idNumber = data.idNumber ?? "";

        this.passportNumber = data.passportNumber ?? "";

        this.nationality = data.nationality ?? "";

        this.dateOfBirth = data.dateOfBirth ?? null;

        this.gender = data.gender ?? "";

        this.language = data.language ?? "English";

        this.address = data.address ?? {};

        this.emergencyContact = data.emergencyContact ?? {};

        this.notes = [];

        this.tags = [];

        this.metadata = {};

    }

    getDisplayName() {

        if (this.fullName) return this.fullName;

        return `${this.firstName} ${this.lastName}`.trim();

    }

    addTag(tag) {

        if (!this.tags.includes(tag)) {

            this.tags.push(tag);

            this.touch();

        }

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

    validate() {

        if (!this.firstName && !this.fullName) {

            throw new Error("Client name is required.");

        }

        return true;

    }

}
