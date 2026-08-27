import auth from "../auth/AuthService.js";

const HOME = "/app/dashboard/super-admin.html";

export function requireAuthenticatedControlPlane() {
    const token = auth.getToken?.();
    if (!token) {
        window.location.replace("/app/auth/login.html");
        return false;
    }
    return true;
}

export function goToSuperAdmin() {
    window.location.assign(HOME);
}

export function bindControlPlaneNavigation() {
    document.querySelectorAll("[data-return-super-admin]").forEach((element) => {
        if (element.dataset.controlPlaneNavBound === "true") return;
        element.dataset.controlPlaneNavBound = "true";
        element.addEventListener("click", (event) => {
            event.preventDefault();
            goToSuperAdmin();
        });
    });
}

export default { requireAuthenticatedControlPlane, goToSuperAdmin, bindControlPlaneNavigation };
