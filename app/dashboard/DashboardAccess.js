/**
 * Isaacs and Partners
 * Dashboard Access
 *
 * Central role/account-type resolver for dashboard navigation.
 * Authentication remains owned by AuthService; application role comes from
 * public.profiles after authentication.
 */

import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const ROLE_ALIASES = Object.freeze({SUPER_ADMIN:"SUPER_ADMIN",ADMIN:"SUPER_ADMIN",ADMINISTRATOR:"SUPER_ADMIN",STAFF:"STAFF",EMPLOYEE:"STAFF",SUPERVISOR:"STAFF",MANAGER:"STAFF",BUSINESS:"BUSINESS",COMPANY:"BUSINESS",COMPANY_ADMIN:"BUSINESS",BUSINESS_ADMIN:"BUSINESS",INDIVIDUAL:"INDIVIDUAL",CLIENT:"INDIVIDUAL",CUSTOMER:"INDIVIDUAL"});
const PROFILE_ROLE_CACHE = new Map();

export function normaliseAccountType(value){const key=String(value||"").trim().toUpperCase().replace(/[ -]+/g,"_");return ROLE_ALIASES[key]||null;}
export function getUserDashboardRole(user){if(!user||typeof user!=="object")return null;const candidates=[user.role,user.accountType,user.account_type,user.userType,user.user_type,user.metadata?.role,user.metadata?.accountType,user.metadata?.account_type,user.user_metadata?.role,user.user_metadata?.accountType,user.user_metadata?.account_type,user.app_metadata?.role,user.app_metadata?.accountType,user.app_metadata?.account_type];for(const candidate of candidates){const role=normaliseAccountType(candidate);if(role)return role;}return null;}

/**
 * Resolve the authoritative role from public.profiles.
 * Never silently defaults an authenticated user to INDIVIDUAL when the
 * authoritative profile cannot be read. That fallback caused protected
 * Super Admin/Staff sessions to enter the wrong dashboard during startup.
 */
export async function resolveUserDashboardRole(user=auth.getCurrentUser()){
    if(!user||typeof user!=="object")return null;
    const userId=user.id||user.user_id||user.userId;
    if(!userId)return getUserDashboardRole(user);
    const key=String(userId),cached=PROFILE_ROLE_CACHE.get(key);if(cached)return cached;
    const token=auth.getToken(),publishableKey=authConfig.supabase.publishableKey;
    if(!token||!publishableKey)return null;
    const params=new URLSearchParams({select:"role,is_active",id:`eq.${encodeURIComponent(key)}`,limit:"1"});
    try{
        const response=await fetch(`${authConfig.supabase.url}/rest/v1/profiles?${params.toString()}`,{method:"GET",headers:{Accept:"application/json",apikey:publishableKey,Authorization:`Bearer ${token}`}});
        if(!response.ok){console.warn(`[DashboardAccess] Profile role lookup failed: HTTP ${response.status}`);return null;}
        const rows=await response.json();const profile=Array.isArray(rows)?rows[0]:rows;const role=normaliseAccountType(profile?.role);
        if(!role||profile?.is_active===false)return null;
        PROFILE_ROLE_CACHE.set(key,role);return role;
    }catch(error){console.warn("[DashboardAccess] Profile role lookup failed:",error);return null;}
}

export function clearRoleCache(userId=null){if(userId){PROFILE_ROLE_CACHE.delete(String(userId));return;}PROFILE_ROLE_CACHE.clear();}
export function isSuperAdmin(user){return getUserDashboardRole(user)==="SUPER_ADMIN";}
export function isStaff(user){return getUserDashboardRole(user)==="STAFF";}
export function isBusiness(user){return getUserDashboardRole(user)==="BUSINESS";}
export function isIndividual(user){return getUserDashboardRole(user)==="INDIVIDUAL";}
export function canAccessDashboard(user,dashboardRole){if(!user)return false;const requested=normaliseAccountType(dashboardRole),actual=getUserDashboardRole(user);if(actual==="SUPER_ADMIN")return requested==="SUPER_ADMIN"||requested==="STAFF";return actual===requested;}

export default {normaliseAccountType,getUserDashboardRole,resolveUserDashboardRole,clearRoleCache,isSuperAdmin,isStaff,isBusiness,isIndividual,canAccessDashboard};
