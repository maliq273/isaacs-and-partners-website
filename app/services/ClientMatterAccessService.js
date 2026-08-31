/**
 * Isaacs & Partners — Client/Matter Access Service
 *
 * Thin application adapter around the Supabase access boundary introduced by
 * PR35. Authorization remains server-side in Supabase RLS/RPC functions.
 *
 * The Supabase client is injected so this service does not create a second
 * configuration or authentication system.
 */

export default class ClientMatterAccessService {
    constructor({ supabaseClient } = {}) {
        this.supabase = supabaseClient;
    }

    _requireClient() {
        if (!this.supabase || typeof this.supabase.rpc !== "function") {
            throw new Error("ClientMatterAccessService requires an initialized Supabase client.");
        }
    }

    async listMyMatters() {
        this._requireClient();

        const { data, error } = await this.supabase.rpc("get_my_matters");
        if (error) throw new Error(`Unable to load matters: ${error.message}`);

        return Array.isArray(data) ? data : [];
    }

    async canAccessMatter(matterId) {
        this._requireClient();
        if (!matterId) return false;

        const { data, error } = await this.supabase.rpc("client_can_access_matter", {
            p_matter_id: matterId
        });
        if (error) throw new Error(`Unable to verify matter access: ${error.message}`);

        return data === true;
    }

    async getMatterContext(matterId) {
        this._requireClient();
        if (!matterId) throw new Error("Matter ID is required.");

        const { data, error } = await this.supabase.rpc("get_matter_access_context", {
            p_matter_id: matterId
        });
        if (error) throw new Error(`Unable to load matter context: ${error.message}`);

        return data || null;
    }
}
