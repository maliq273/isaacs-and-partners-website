/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SuccessResult
 * ============================================================
 */

import Result from "./Result.js";

export default class SuccessResult
    extends Result {

    constructor(data = {}) {

        super({

            ...data,

            success: true,

            code:
                data.code ??
                "SUCCESS"

        });

        // ====================================================
        // FUTURE INSERT
        //
        // Created result
        // Updated result
        // Deleted result
        // Submitted result
        // Completed result
        //
        // ====================================================
    }


    static create(
        data = null,
        message =
            "Operation completed successfully.",
        options = {}
    ) {

        return new SuccessResult({

            data,

            message,

            ...options

        });

    }

}
