/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Invoice
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Invoice extends Record {

    constructor(data = {}) {

        super(data);

        this.invoiceNumber =
            data.invoiceNumber ?? "";

        this.clientId =
            data.clientId ?? null;

        this.companyId =
            data.companyId ?? null;

        this.matterId =
            data.matterId ?? null;

        this.issueDate =
            data.issueDate ??
            new Date().toISOString();

        this.dueDate =
            data.dueDate ?? null;

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

        this.amountPaid =
            Number(data.amountPaid ?? 0);

        this.balance =
            Number(data.balance ?? this.total);

        this.notes =
            data.notes ?? "";

        this.paymentTerms =
            data.paymentTerms ??
            "ON RECEIPT";

        // ====================================================
        // FUTURE INSERT
        //
        // SARS invoice requirements
        // VAT handling
        // Invoice numbering
        // Zoho integration
        // ACB/payment integration
        // ====================================================
    }


    addItem(
        item
    ) {

        this.items.push({
            description:
                item.description ?? "",

            quantity:
                Number(item.quantity ?? 1),

            unitPrice:
                Number(item.unitPrice ?? 0),

            total:
                Number(item.total ??
                    (
                        Number(item.quantity ?? 1) *
                        Number(item.unitPrice ?? 0)
                    )
                )
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

        this.balance =
            Math.max(
                0,
                this.total -
                this.amountPaid
            );

        this.touch();

        return this;

    }


    recordPayment(
        amount
    ) {

        this.amountPaid +=
            Number(amount ?? 0);

        this.recalculate();

        if (
            this.balance <= 0
        ) {

            this.status =
                "PAID";

        }
        else if (
            this.amountPaid > 0
        ) {

            this.status =
                "PARTIALLY_PAID";

        }

        this.touch();

        return this;

    }


    validate() {

        super.validate();

        if (!this.invoiceNumber) {

            throw new Error(
                "Invoice number is required."
            );

        }

        return true;

    }

}
