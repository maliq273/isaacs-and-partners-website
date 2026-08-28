/**
 * Shared control-plane runtime guard.
 *
 * Keeps Super Admin and Staff dashboard actions on the same authenticated
 * Supabase session and gives pages a consistent return-to-dashboard action.
 */
import auth from "../auth/AuthService.js";
import navigation from "../core/navigation.js";

export async function requireControlPlaneRole(allowedRoles = ["SUPER_ADMIN", "STAFF"]) {
    await auth.initialise();
    if (!auth.isAuthenticated()) {
        navigation.toLogin(window.location.pathname, { replace: true });
        return null;
    }

    const { resolveUserDashboardRole } = await import("./DashboardAccess.js");
    const role = await resolveUserDashboardRole(auth.getCurrentUser());
    if (!allowedRoles.includes(role)) {
        navigation.toRoleDashboard(role, { replace: true });
        return null;
    }
    return role;
}

export function ensureSuperAdminReturnLink(selector = ".page-actions") {
    const host = document.querySelector(selector);
    if (!host || document.querySelector("[data-control-plane-return]")) return;
    const link = document.createElement("a");
    link.className = "btn btn-secondary";
    link.href = "./super-admin.html";
    link.dataset.controlPlaneReturn = "true";
    link.textContent = "← Super Admin";
    host.prepend(link);
}

export default { requireControlPlaneRole, ensureSuperAdminReturnLink };
