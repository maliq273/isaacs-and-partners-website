/**
 * Isaacs and Partners
 * Application Navigation
 *
 * Central navigation adapter for authentication and dashboard transitions.
 * Unknown roles fail closed instead of silently entering the Individual area.
 */

import ROUTES from "../config/routes.js";
import { getUserDashboardRole } from "../dashboard/DashboardAccess.js";

class Navigation {
    constructor(){this.loginRoute=ROUTES.LOGIN;this.dashboardRoute=ROUTES.DASHBOARD;this.staffDashboardRoute=ROUTES.STAFF_DASHBOARD;this.individualDashboardRoute=ROUTES.INDIVIDUAL_DASHBOARD;this.businessDashboardRoute=ROUTES.BUSINESS_DASHBOARD;this.superAdminDashboardRoute=ROUTES.SUPER_ADMIN_DASHBOARD;}
    getLoginRoute(){return this.loginRoute;}
    getDashboardRoute(){return this.dashboardRoute;}
    getDashboardRouteForRole(role){switch(String(role||"").toUpperCase()){case "SUPER_ADMIN":return this.superAdminDashboardRoute;case "STAFF":return this.staffDashboardRoute;case "BUSINESS":return this.businessDashboardRoute;case "INDIVIDUAL":return this.individualDashboardRoute;default:return null;}}
    getDashboardRouteForUser(user){return this.getDashboardRouteForRole(getUserDashboardRole(user));}
    toLogin(returnUrl=null,{replace=true}={}){return this._navigate(this._withReturnUrl(this.loginRoute,returnUrl),{replace});}
    toDashboard({replace=true}={}){return this._navigate(this.dashboardRoute,{replace});}
    toRoleDashboard(role,{replace=true}={}){const target=this.getDashboardRouteForRole(role);return target?this._navigate(target,{replace}):this.toLogin(null,{replace});}
    toUserDashboard(user,{replace=true}={}){const target=this.getDashboardRouteForUser(user);return target?this._navigate(target,{replace}):this.toLogin(null,{replace});}
    _withReturnUrl(route,returnUrl){if(!returnUrl)return route;const url=new URL(route,typeof window!=="undefined"?window.location.origin:"http://localhost");url.searchParams.set("returnUrl",returnUrl);return url.pathname+url.search;}
    _navigate(path,{replace=true}={}){if(typeof window==="undefined")return path;if(replace)window.location.replace(path);else window.location.assign(path);return path;}
}

export const navigation=new Navigation();
export { Navigation };
export default navigation;
