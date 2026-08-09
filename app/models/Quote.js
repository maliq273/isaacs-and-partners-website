/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Quote
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Quote extends Record {

    constructor(data = {}) {

        super(data);

        this.quoteNumber =
            data.quoteNumber ?? "";

        this.clientId =
            data.clientId ?? null;

        this.companyId =
            data.companyId ?? null;

        this.matterId =
            data.matterId ?? null;

        this.issueDate =
            data.issueDate ??
            new Date().toISOString();

        this.expiryDate =
            data.expiryDate ?? null;

        this.status =
            data.status ?? "DRAFT";

        this.currency =
            data.currency ?? "ZAR";

        this.items = [
            ...(data.items ?? [])
        ];

        this.subtotal =
            Number(data.subtotal ?? 0);

        this.discount =
            Number(data.discount ?? 0);

        this.tax =
            Number(data.tax ?? 0);

        this.total =
            Number(data.total ?? 0);

        this.notes =
            data.notes ?? "";

        this.terms =
            data.terms ?? "";

        // ====================================================
        // FUTURE INSERT
        //
        // Quote approval
        // Client acceptance
        // Quote-to-invoice conversion
        // Zoho integration
        // ====================================================
    }


    addItem(
        item
    ) {

        const quantity =
            Number(item.quantity ?? 1);

        const unitPrice =
            Number(item.unitPrice ?? 0);

        this.items.push({

            description:
                item.description ?? "",

            quantity,

            unitPrice,

            total:
                quantity * unitPrice

        });

        this.recalculate();

        return this;

    }


    recalculate() {

        this.subtotal =
            this.items.reduce(
                (sum, item) =>
                    sum +
                    (
                        Number(item.quantity ?? 0) *
                        Number(item.unitPrice ?? 0)
                    ),
                0
            );

        this.total =
            Math.max(
                0,
                this.subtotal -
                this.discount +
                this.tax
            );

        this.touch();

        return this;

    }


    accept() {

        this.status =
            "ACCEPTED";

        this.touch();

        return this;

    }


    reject() {

        this.status =
            "REJECTED";

        this.touch();

        return this;

    }


    validate() {

        super.validate();

        if (!this.quoteNumber) {

            throw new Error(
                "Quote number is required."
            );

        }

        return true;

    }

}
