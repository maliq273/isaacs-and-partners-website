/**
 * Isaacs & Partners — AI Liaison Runtime Service
 *
 * Browser-safe client facade for the Supabase-backed AI liaison runtime.
 * Authentication remains the responsibility of the existing Supabase session.
 * No service-role key, OpenWA key, or other privileged secret belongs here.
 */
export default class AILiaisonRuntimeService {
    constructor(supabaseClient) {
        if (!supabaseClient) throw new Error("Supabase client is required.");
        this.supabase = supabaseClient;
        this.functionName = "ai-liaison-runtime";
    }

    async sendClientMessage({
        body,
        chatId = null,
        phoneNumber = null,
        channel = "PORTAL",
        matterId = null,
        messageId = null,
        intent = null,
        serviceDomain = null
    } = {}) {
        const text = String(body || "").trim();
        if (!text) throw new Error("Message body is required.");

        const { data: sessionData, error: sessionError } =
            await this.supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!sessionData?.session?.access_token) {
            throw new Error("Authentication required.");
        }

        const { data, error } = await this.supabase.functions.invoke(
            this.functionName,
            {
                body: {
                    body: text,
                    chatId,
                    phoneNumber,
                    channel,
                    matterId,
                    messageId,
                    intent,
                    serviceDomain
                }
            }
        );

        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || "AI liaison runtime failed.");

        return data;
    }

    async getConversation(conversationId) {
        if (!conversationId) throw new Error("Conversation ID is required.");

        const { data, error } = await this.supabase
            .from("ai_conversations")
            .select("*")
            .eq("id", conversationId)
            .single();

        if (error) throw error;
        return data;
    }

    async listMessages(conversationId, limit = 100) {
        if (!conversationId) throw new Error("Conversation ID is required.");

        const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
        const { data, error } = await this.supabase
            .from("ai_conversation_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(safeLimit);

        if (error) throw error;
        return data || [];
    }
}
