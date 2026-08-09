/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Subscription
 * ------------------------------------------------------------
 * Represents the commercial subscription attached to a license.
 * ============================================================
 */

export default class Subscription {

    constructor(data = {}) {

        this.id =
            data.id ??
            null;

        this.customerId =
            data.customerId ??
            null;

        this.licenseId =
            data.licenseId ??
            null;

        this.plan =
            data.plan ??
            "standard";

        this.status =
            data.status ??
            "inactive";

        this.billingCycle =
            data.billingCycle ??
            "monthly";

        this.amount =
            Number.isFinite(
                Number(data.amount)
            )
                ? Number(data.amount)
                : 0;

        this.currency =
            data.currency ??
            "ZAR";

        this.startsAt =
            data.startsAt ??
            null;

        this.renewsAt =
            data.renewsAt ??
            null;

        this.endsAt =
            data.endsAt ??
            null;

        this.autoRenew =
            data.autoRenew ??
            true;

        this.metadata =
            data.metadata &&
            typeof data.metadata === "object"
                ? { ...data.metadata }
                : {};

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Payment provider
        // Recurring billing
        // Failed payment handling
        // Grace periods
        // Plan upgrades
        // Plan downgrades
        // Feature entitlements
        // ====================================================
    }


    isActive(
        now = new Date()
    ) {

        if (
            this.status !== "active"
        ) {
            return false;
        }

        if (
            !this.endsAt
        ) {
            return true;
        }

        return (
            new Date(this.endsAt) > now
        );

    }


    cancel() {

        this.status =
            "cancelled";

        this.autoRenew =
            false;

        return this;

    }


    renew(
        renewalDate
    ) {

        this.status =
            "active";

        this.renewsAt =
            renewalDate;

        return this;

    }


    toJSON() {

        return {
            id: this.id,
            customerId: this.customerId,
            licenseId: this.licenseId,
            plan: this.plan,
            status: this.status,
            billingCycle: this.billingCycle,
            amount: this.amount,
            currency: this.currency,
            startsAt: this.startsAt,
            renewsAt: this.renewsAt,
            endsAt: this.endsAt,
            autoRenew: this.autoRenew,
            metadata: {
                ...this.metadata
            }
        };

    }

}
