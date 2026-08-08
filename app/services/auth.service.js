/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * auth.service.js
 * ============================================================
 *
 * LOCATION
 * app/services/auth.service.js
 *
 * PURPOSE
 * Legacy compatibility adapter.
 *
 * MAIN SERVICE
 * AuthenticationService.js
 * ============================================================
 */

import AuthenticationService
    from "./AuthenticationService.js";

const authenticationService =
    new AuthenticationService();

export async function login(
    credentials
) {

    return authenticationService.login(
        credentials
    );
}

export async function logout() {

    return authenticationService.logout();

}

export function getSession() {

    return authenticationService.getSession();

}

export function isAuthenticated() {

    return authenticationService.isAuthenticated();

}

export function refreshActivity() {

    return authenticationService.refreshActivity();

}

export function hasPermission(
    permission
) {

    return authenticationService.hasPermission(
        permission
    );
}


/*
 * ============================================================
 * FUTURE INSERT
 *
 * Do NOT build independent authentication logic here.
 *
 * All authentication functionality must eventually flow through:
 *
 * AuthenticationService.js
 *
 * ============================================================
 */

export default authenticationService;
