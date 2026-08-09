/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Matter Status
 * ------------------------------------------------------------
 * Matter lifecycle and status transition rules.
 * ============================================================
 */

import {
    MatterStatus as DomainMatterStatus
} from "../domain/enums/index.js";

export default class MatterStatus {

    constructor() {

        this.statuses = {

            NEW:
                DomainMatterStatus.NEW,

            OPEN:
                DomainMatterStatus.OPEN,

            IN_PROGRESS:
                DomainMatterStatus.IN_PROGRESS,

            ON_HOLD:
                DomainMatterStatus.ON_HOLD,

            COMPLETED:
                DomainMatterStatus.COMPLETED,

            CLOSED:
                DomainMatterStatus.CLOSED,

            CANCELLED:
                DomainMatterStatus.CANCELLED

        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Additional immigration statuses
        // VFS submitted
        // DHA submitted
        // Awaiting outcome
        // Appeal pending
        // CCMA statuses
        // ====================================================
    }


    getAll() {

        return {
            ...this.statuses
        };

    }


    isValid(
        status
    ) {

        return Object.values(
            this.statuses
        ).includes(
            status
        );

    }


    canTransition(
        from,
        to
    ) {

        if (!this.isValid(from)) {

            return false;

        }

        if (!this.isValid(to)) {

            return false;

        }

        if (from === to) {

            return true;

        }

        const transitions = {

            [this.statuses.NEW]: [
                this.statuses.OPEN,
                this.statuses.CANCELLED
            ],

            [this.statuses.OPEN]: [
                this.statuses.IN_PROGRESS,
                this.statuses.ON_HOLD,
                this.statuses.CANCELLED
            ],

            [this.statuses.IN_PROGRESS]: [
                this.statuses.ON_HOLD,
                this.statuses.COMPLETED,
                this.statuses.CANCELLED
            ],

            [this.statuses.ON_HOLD]: [
                this.statuses.OPEN,
                this.statuses.IN_PROGRESS,
                this.statuses.CANCELLED
            ],

            [this.statuses.COMPLETED]: [
                this.statuses.CLOSED
            ],

            [this.statuses.CLOSED]: [],

            [this.statuses.CANCELLED]: []

        };

        return (
            transitions[from] ??
            []
        ).includes(to);

    }


    assertTransition(
        from,
        to
    ) {

        if (
            !this.canTransition(
                from,
                to
            )
        ) {

            throw new Error(
                `Invalid matter status transition: ${from} -> ${to}`
            );

        }

        return true;

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Configurable workflow transitions
    // Role-based transitions
    // Permission checks
    // Automatic status transitions
    // ========================================================

}
