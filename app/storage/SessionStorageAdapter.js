/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SessionStorageAdapter
 * ============================================================
 */

import LocalStorageAdapter
    from "./LocalStorageAdapter.js";

export default class SessionStorageAdapter
    extends LocalStorageAdapter {

    constructor(options = {}) {

        super({
            ...options,
            name: "SessionStorageAdapter",
            storage:
                options.storage ??
                globalThis.sessionStorage,
            prefix:
                options.prefix ??
                "isaacs:session:"
        });

        this.name =
            "SessionStorageAdapter";

    }


    // =========================================================
    // FUTURE INSERT
    // Session expiry
    // Idle timeout
    // Automatic logout
    // Supervisor user-log integration
    // =========================================================

}
