import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

class AuthorityPeopleDataService {
    get endpoint() { return `${authConfig.supabase.url}/functions/v1/admin-authority-directory`; }
    async request(payload = null) {
        await auth.initialise();
        if (!auth.isAuthenticated()) throw new Error("Authentication required.");
        const response = await fetch(this.endpoint, { method: payload ? "POST" : "GET", headers: { Accept: "application/json", "Content-Type": "application/json", apikey: authConfig.supabase.publishableKey, Authorization: `Bearer ${auth.getToken()}` }, body: payload ? JSON.stringify(payload) : undefined });
        const raw = await response.text(); let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
        if (!response.ok) throw new Error(data?.error || `Authority request failed (${response.status}).`);
        return data;
    }
    list() { return this.request(); }
    save(row) { return this.request({ action: "save", ...row }); }
    deactivate(id) { return this.request({ action: "deactivate", id }); }
}
export const authorityPeopleData = new AuthorityPeopleDataService();
export default authorityPeopleData;