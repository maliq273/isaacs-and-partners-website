import authConfig from "../auth/auth.config.js";

const RPC_URL = `${authConfig.supabase.url}/rest/v1/rpc`;
const PUBLISHABLE_KEY = authConfig.supabase.publishableKey;

class PublicEnquiryService {
    async submitEnquiry({
        sessionId,
        categoryId = null,
        serviceId = null,
        serviceName = null,
        serviceDomain = null,
        answers = [],
        qualified = false,
        metadata = {}
    }) {
        if (!sessionId) return null;

        try {
            const response = await fetch(`${RPC_URL}/submit_public_enquiry`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    apikey: PUBLISHABLE_KEY
                },
                body: JSON.stringify({
                    p_session_id: sessionId,
                    p_category_id: categoryId,
                    p_service_id: serviceId,
                    p_service_name: serviceName,
                    p_service_domain: serviceDomain,
                    p_answers: Array.isArray(answers) ? answers : [],
                    p_qualified: Boolean(qualified),
                    p_metadata: metadata || {}
                })
            });

            if (!response.ok) {
                const text = await response.text();
                console.warn("[PublicEnquiryService] submit_public_enquiry failed:", text);
                return null;
            }

            return await response.json();
        } catch (error) {
            console.warn("[PublicEnquiryService] Network/RPC error:", error);
            return null;
        }
    }

    async linkToClient(sessionId, userId, authToken) {
        if (!sessionId || !userId || !authToken) return false;

        try {
            const response = await fetch(`${RPC_URL}/link_public_enquiry_to_client`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    apikey: PUBLISHABLE_KEY,
                    Authorization: `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    p_session_id: sessionId,
                    p_user_id: userId
                })
            });

            if (!response.ok) {
                console.warn("[PublicEnquiryService] link_public_enquiry_to_client failed:", await response.text());
                return false;
            }

            return true;
        } catch (error) {
            console.warn("[PublicEnquiryService] Link error:", error);
            return false;
        }
    }
}

export const publicEnquiryService = new PublicEnquiryService();
export default publicEnquiryService;
