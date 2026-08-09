/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * User Mapper
 * ------------------------------------------------------------
 * Maps user records while protecting sensitive authentication
 * information.
 * ============================================================
 */

export default class UserMapper {

    static toPersistence(user) {

        if (!user) {
            return null;
        }

        const data =
            typeof user.toJSON === "function"
                ? user.toJSON()
                : { ...user };

        return {
            ...data,
            id: user.id ?? data.id ?? null
        };

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Authentication provider mapping
        // Role mapping
        // Permission mapping
        // MFA metadata
        // ====================================================
    }


    static fromPersistence(data) {

        if (!data) {
            return null;
        }

        return {
            ...data
        };
    }


    static toTransport(user) {

        if (!user) {
            return null;
        }

        const data = {
            ...this.toPersistence(user)
        };

        /*
         * Authentication secrets must never be exposed
         * through ordinary transport responses.
         */

        delete data.password;
        delete data.passwordHash;
        delete data.refreshToken;
        delete data.accessToken;
        delete data.secret;
        delete data.mfaSecret;

        return data;
    }


    static collection(items = []) {

        return items
            .filter(Boolean)
            .map(item =>
                this.toTransport(item)
            );
    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Security clearance mapping
    // Staff role mapping
    // Supervisor permissions
    // Audit permissions
    // ========================================================

}
