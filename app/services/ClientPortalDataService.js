import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const RPC_URL = `${authConfig.supabase.url}/rest/v1/rpc`;

class ClientPortalDataService {
    async request(functionName, body = {}) {
        await auth.initialise();
        if (!auth.isAuthenticated()) throw new Error("Authentication required.");
        const response = await fetch(`${RPC_URL}/${functionName}`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                apikey: authConfig.supabase.publishableKey,
                Authorization: `Bearer ${auth.getToken()}`
            },
            body: JSON.stringify(body)
        });
        const raw = await response.text();
        let data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
        if (!response.ok) throw new Error(data?.message || data?.details || data?.hint || "Client portal request failed.");
        return data;
    }

    async getDashboard() {
        return this.request("client_portal_dashboard_snapshot");
    }
}

export const clientPortalData = new ClientPortalDataService();
export { ClientPortalDataService };
export default clientPortalData;
