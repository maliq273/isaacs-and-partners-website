/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Payment
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Payment extends Record {

    constructor(data = {}) {

        super(data);

        this.paymentNumber =
            data.paymentNumber ?? "";

        this.clientId =
            data.clientId ?? null;

        this.companyId =
            data.companyId ?? null;

        this.matterId =
            data.matterId ?? null;

        this.invoiceId =
            data.invoiceId ?? null;

        this.amount =
            Number(data.amount ?? 0);

        this.currency =
            data.currency ?? "ZAR";

        this.method =
            data.method ?? "BANK_TRANSFER";

        this.reference =
            data.reference ?? "";

        this.status =
            data.status ?? "PENDING";

        this.paymentDate =
            data.paymentDate ?? null;

        this.notes =
            data.notes ?? "";

        // ====================================================
        // FUTURE INSERT
        //
        // Bank reconciliation
        // Payment gateway
        // ACB
        // Proof-of-payment matching
        // Automated invoice allocation
        // ====================================================
    }


    complete() {

        this.status =
            "COMPLETED";

        this.paymentDate =
            this.paymentDate ??
            new Date().toISOString();

        this.touch();

        return this;

    }


    fail(
        reason = ""
    ) {

        this.status =
            "FAILED";

        this.metadata.failureReason =
            reason;

        this.touch();

        return this;

    }


    validate() {

        super.validate();

        if (
            this.amount <= 0
        ) {

            throw new Error(
                "Payment amount must be greater than zero."
            );

        }

        return true;

    }

}
