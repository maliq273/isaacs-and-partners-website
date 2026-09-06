import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const REST_URL = `${authConfig.supabase.url}/rest/v1`;
const RPC_URL = `${authConfig.supabase.url}/rest/v1/rpc`;

class AILiaisonControlService {
    async request(path, options = {}) {
        await auth.initialise(); if (!auth.isAuthenticated()) throw new Error("Authentication required.");
        const response = await fetch(`${REST_URL}/${path}`, { ...options, headers: { Accept: "application/json", "Content-Type": "application/json", apikey: authConfig.supabase.publishableKey, Authorization: `Bearer ${auth.getToken()}`, ...(options.headers || {}) } });
        const raw = await response.text(); let data = null; try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
        if (!response.ok) throw new Error(data?.message || data?.details || data?.hint || `AI control request failed (${response.status}).`); return data;
    }
    async rpc(name, body) {
        await auth.initialise(); if (!auth.isAuthenticated()) throw new Error("Authentication required.");
        const response = await fetch(`${RPC_URL}/${name}`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", apikey: authConfig.supabase.publishableKey, Authorization: `Bearer ${auth.getToken()}` }, body: JSON.stringify(body) });
        const raw = await response.text(); let data = null; try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
        if (!response.ok) throw new Error(data?.message || data?.details || `AI control action failed (${response.status}).`); return data;
    }
    async getCurrentProfile() { const user = auth.getCurrentUser(); if (!user?.id) return null; const rows = await this.request(`profiles?select=id,email,first_name,last_name,role,is_active&id=eq.${encodeURIComponent(user.id)}&limit=1`); return rows?.[0] || null; }
    async listInterventions() { return this.request("human_interventions?select=*&order=created_at.desc&limit=50"); }
    async getConversation(id) { const rows = await this.request(`ai_conversations?select=*&id=eq.${encodeURIComponent(id)}&limit=1`); return rows?.[0] || null; }
    assign(id, staffUserId) { return this.rpc("ai_assign_human_intervention", { p_intervention_id: id, p_staff_user_id: staffUserId }); }
    staffRespond(id, response, resolve = false) { return this.rpc("ai_staff_respond_to_intervention", { p_intervention_id: id, p_response: response, p_resolve: resolve }); }
    superAdminRespond(id, response, resolve = true) { return this.rpc("ai_super_admin_respond_to_intervention", { p_intervention_id: id, p_response: response, p_resolve: resolve }); }
    appendMessage(conversationId, senderType, body) { return this.rpc("ai_append_conversation_message", { p_conversation_id: conversationId, p_sender_type: senderType, p_direction: "OUTBOUND", p_body: body, p_intent: "HUMAN_RESPONSE", p_service_domain: null, p_metadata: { source: "ai-control-plane" } }); }
    relay(id, message) { return this.rpc("ai_relay_intervention_to_client", { p_intervention_id: id, p_client_message: message }); }
}

export const aiLiaisonControl = new AILiaisonControlService();
export default aiLiaisonControl;
