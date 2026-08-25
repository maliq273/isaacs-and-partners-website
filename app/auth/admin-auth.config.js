/**
 * Isaacs and Partners
 * Super Admin Authentication Policy
 *
 * SECURITY RULE:
 * No Super Admin password, service-role key, recovery secret, or
 * database credential belongs in this file or anywhere in the client bundle.
 * Authentication is delegated to the backend/Supabase Auth and the
 * SUPER_ADMIN role must be enforced server-side with RLS.
 */

const ADMIN_AUTH_CONFIG = Object.freeze({
    role: "SUPER_ADMIN",

    loginPath: "/app/auth/admin-login.html",

    dashboardPath: "/app/dashboard/super-admin.html",

    authRequired: true,

    requireExplicitRole: true,

    requireMfa: true,

    allowSelfRegistration: false,

    allowPasswordRecovery: false,

    auditActions: true,

    denyClientRoleElevation: true
});

export default ADMIN_AUTH_CONFIG;
export { ADMIN_AUTH_CONFIG };
