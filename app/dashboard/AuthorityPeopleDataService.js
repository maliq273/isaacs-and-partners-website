import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const DEFAULT_AUTHORITY = [
    { id: "auth-001", full_name: "Adv. S. Isaacs", phone_number: "+27820000001", authority_role: "SUPER_ADMIN", job_title: "Senior Managing Partner", department: "Legal Practice & Executive", is_active: true, ai_permissions: { can_liaise_with_ai: true, can_approve_quotes: true, manage_system: true } },
    { id: "auth-002", full_name: "M. Patel", phone_number: "+27820000002", authority_role: "SUPER_ADMIN", job_title: "Senior Legal Practitioner", department: "Commercial & Corporate", is_active: true, ai_permissions: { can_liaise_with_ai: true, can_approve_quotes: true } },
    { id: "auth-003", full_name: "N. Dlamini", phone_number: "+27820000003", authority_role: "STAFF", job_title: "Senior Immigration Specialist", department: "Immigration & Visas", is_active: true, ai_permissions: { can_liaise_with_ai: true, can_handle_immigration: true } }
];

class AuthorityPeopleDataService {
    get endpoint() { return `${authConfig.supabase.url}/functions/v1/admin-authority-directory`; }
    async request(payload = null) {
        await auth.initialise();
        if (!auth.isAuthenticated()) throw new Error("Authentication required.");
        try {
            const response = await fetch(this.endpoint, { method: payload ? "POST" : "GET", headers: { Accept: "application/json", "Content-Type": "application/json", apikey: authConfig.supabase.publishableKey, Authorization: `Bearer ${auth.getToken()}` }, body: payload ? JSON.stringify(payload) : undefined });
            const raw = await response.text(); let data = {};
            try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
            if (!response.ok) throw new Error(data?.error || `Authority request failed (${response.status}).`);
            return data;
        } catch (error) {
            if (!payload) {
                console.warn("[AuthorityPeopleDataService] Network fetch failed, returning default authority records:", error);
                return { rows: DEFAULT_AUTHORITY };
            }
            throw error;
        }
    }
    list() { return this.request(); }
    save(row) { return this.request({ action: "save", ...row }); }
    deactivate(id) { return this.request({ action: "deactivate", id }); }
}
export const authorityPeopleData = new AuthorityPeopleDataService();
export default authorityPeopleData;