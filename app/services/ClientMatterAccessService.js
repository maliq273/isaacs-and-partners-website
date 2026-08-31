/**
 * Isaacs & Partners — Client/Matter Access Service
 *
 * Thin application adapter around the Supabase access boundary introduced by
 * PR35. This file does not implement authorization itself. Supabase RLS and
 * the RPC functions remain authoritative.
 */

import supabase from "../config/supabase.js";

const ClientMatterAccessService = {
    async listMyMatters() {
        const { data, error } = await supabase.rpc("get_my_matters");

        if (error) {
            throw new Error(`Unable to load matters: ${error.message}`);
        }

        return Array.isArray(data) ? data : [];
    },

    async canAccessMatter(matterId) {
        if (!matterId) return false;

        const { data, error } = await supabase.rpc("client_can_access_matter", {
            p_matter_id: matterId
        });

        if (error) {
            throw new Error(`Unable to verify matter access: ${error.message}`);
        }

        return data === true;
    },

    async getMatterContext(matterId) {
        if (!matterId) {
            throw new Error("Matter ID is required.");
        }

        const { data, error } = await supabase.rpc("get_matter_access_context", {
            p_matter_id: matterId
        });

        if (error) {
            throw new Error(`Unable to load matter context: ${error.message}`);
        }

        return data || null;
    }
};

export default ClientMatterAccessService;
