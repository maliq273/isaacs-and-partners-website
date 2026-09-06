import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const RPC_URL = `${authConfig.supabase.url}/rest/v1/rpc`;

class ClientPortalAdminService {
    async request(name, body = {}) {
        await auth.initialise();
        if (!auth.isAuthenticated()) throw new Error("Authentication required.");
        const response = await fetch(`${RPC_URL}/${name}`, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json", apikey: authConfig.supabase.publishableKey, Authorization: `Bearer ${auth.getToken()}` },
            body: JSON.stringify(body)
        });
        const raw = await response.text(); let data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
        if (!response.ok) throw new Error(data?.message || data?.details || "Administrative request failed.");
        return data;
    }
    snapshot() { return this.request("client_portal_admin_snapshot"); }
    approve(userId, notes = null) { return this.request("client_portal_approve", { p_user_id: userId, p_notes: notes }); }
    suspend(userId, notes = null) { return this.request("client_portal_suspend", { p_user_id: userId, p_notes: notes }); }
}

export const clientPortalAdmin = new ClientPortalAdminService();
export default clientPortalAdmin;
