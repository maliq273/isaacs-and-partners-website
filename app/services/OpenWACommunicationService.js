/**
 * Isaacs & Partners — PR43 OpenWA Communication Service
 *
 * Browser-safe facade. It only queues messages through an RLS-protected RPC
 * and reads communication history allowed to the signed-in user.
 * OpenWA API credentials never belong in this file.
 */
export default class OpenWACommunicationService {
    constructor(supabaseClient) {
        if (!supabaseClient) throw new Error("Supabase client is required.");
        this.supabase = supabaseClient;
    }

    async queueWhatsAppMessage({ chatId, body, matterId = null, phoneNumber = null }) {
        const { data, error } = await this.supabase.rpc("queue_openwa_message", {
            p_chat_id: String(chatId || "").trim(),
            p_body: String(body || ""),
            p_matter_id: matterId,
            p_phone_number: phoneNumber ? String(phoneNumber).trim() : null
        });

        if (error) throw error;
        return data;
    }

    async listMessages({ matterId = null, limit = 100 } = {}) {
        let query = this.supabase
            .from("communication_messages")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(Math.min(Math.max(Number(limit) || 100, 1), 200));

        if (matterId) query = query.eq("matter_id", matterId);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async registerContact({ phoneNumber, chatId }) {
        const { data: userData, error: userError } = await this.supabase.auth.getUser();
        if (userError) throw userError;
        if (!userData?.user?.id) throw new Error("Authentication required.");

        const { data, error } = await this.supabase
            .from("communication_contacts")
            .upsert({
                user_id: userData.user.id,
                phone_number: String(phoneNumber || "").trim(),
                chat_id: String(chatId || "").trim(),
                is_active: true
            }, { onConflict: "chat_id" })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}
