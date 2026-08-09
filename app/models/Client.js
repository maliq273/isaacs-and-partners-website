/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Client
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Client extends Record {

    constructor(data = {}) {

        super(data);

        this.clientNumber =
            data.clientNumber ?? "";

        this.type =
            data.type ?? "INDIVIDUAL";

        this.firstName =
            data.firstName ?? "";

        this.middleName =
            data.middleName ?? "";

        this.lastName =
            data.lastName ?? "";

        this.companyName =
            data.companyName ?? "";

        this.idNumber =
            data.idNumber ?? "";

        this.passportNumber =
            data.passportNumber ?? "";

        this.dateOfBirth =
            data.dateOfBirth ?? null;

        this.nationality =
            data.nationality ?? "";

        this.country =
            data.country ?? "";

        this.email =
            data.email ?? "";

        this.phone =
            data.phone ?? "";

        this.whatsapp =
            data.whatsapp ?? data.phone ?? "";

        this.address = {
            ...(data.address ?? {})
        };

        this.status =
            data.status ?? "ACTIVE";

        this.source =
            data.source ?? "WEBSITE";

        this.tags = [
            ...(data.tags ?? [])
        ];

        this.notes =
            data.notes ?? "";

        this.consent = {
            popia:
                data.consent?.popia === true,

            marketing:
                data.consent?.marketing === true,

            communications:
                data.consent?.communications !== false
        };

        // ====================================================
        // FUTURE INSERT
        //
        // POPIA consent history
        // Passport verification
        // Client portal
        // WhatsApp identity verification
        // Duplicate client detection
        // ====================================================
    }


    getFullName() {

        return [
            this.firstName,
            this.middleName,
            this.lastName
        ]
            .filter(Boolean)
            .join(" ");

    }


    setContact(
        email,
        phone
    ) {

        this.email = email ?? this.email;
        this.phone = phone ?? this.phone;

        if (!this.whatsapp) {
            this.whatsapp = this.phone;
        }

        this.touch();

        return this;

    }


    addTag(
        tag
    ) {

        if (
            tag &&
            !this.tags.includes(tag)
        ) {

            this.tags.push(tag);

            this.touch();

        }

        return this;

    }


    removeTag(
        tag
    ) {

        this.tags =
            this.tags.filter(
                item => item !== tag
            );

        this.touch();

        return this;

    }


    validate() {

        super.validate();

        if (
            this.type === "INDIVIDUAL" &&
            !this.getFullName()
        ) {

            throw new Error(
                "Client name is required."
            );

        }

        return true;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Client risk profile
    // Client classification
    // AI profile
    // Immigration history
    // Matter history
    // ========================================================

}
