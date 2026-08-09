/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Department
 * ============================================================
 */

import Record from "./base/Record.js";

export default class Department extends Record {

    constructor(data = {}) {

        super(data);

        this.code =
            data.code ?? "";

        this.name =
            data.name ?? "";

        this.description =
            data.description ?? "";

        this.managerId =
            data.managerId ?? null;

        this.permissions = [
            ...(data.permissions ?? [])
        ];

        this.active =
            data.active !== false;

        // ====================================================
        // FUTURE INSERT
        //
        // Department workflow
        // Department-specific AI
        // Staff assignment
        // Department KPIs
        // ====================================================
    }


    addPermission(
        permission
    ) {

        if (
            permission &&
            !this.permissions.includes(
                permission
            )
        ) {

            this.permissions.push(
                permission
            );

            this.touch();

        }

        return this;

    }


    validate() {

        super.validate();

        if (!this.name) {

            throw new Error(
                "Department name is required."
            );

        }

        return true;

    }

}
