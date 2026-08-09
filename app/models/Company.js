/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Company
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Company extends Record {

    constructor(data = {}) {

        super(data);

        this.registrationNumber =
            data.registrationNumber ?? "";

        this.taxNumber =
            data.taxNumber ?? "";

        this.vatNumber =
            data.vatNumber ?? "";

        this.name =
            data.name ?? "";

        this.tradingName =
            data.tradingName ?? "";

        this.email =
            data.email ?? "";

        this.phone =
            data.phone ?? "";

        this.website =
            data.website ?? "";

        this.address = {
            ...(data.address ?? {})
        };

        this.postalAddress = {
            ...(data.postalAddress ?? {})
        };

        this.bankDetails = {
            ...(data.bankDetails ?? {})
        };

        this.contacts = [
            ...(data.contacts ?? [])
        ];

        this.status =
            data.status ?? "ACTIVE";

        // ====================================================
        // FUTURE INSERT
        //
        // CIPC verification
        // SARS verification
        // VAT verification
        // COIDA information
        // UIF information
        // Company compliance profile
        // ====================================================
    }


    addContact(
        contact
    ) {

        this.contacts.push(
            contact
        );

        this.touch();

        return this;

    }


    validate() {

        super.validate();

        if (!this.name) {

            throw new Error(
                "Company name is required."
            );

        }

        return true;

    }

}
