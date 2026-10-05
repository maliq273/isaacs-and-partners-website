import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import authConfig from "../auth/auth.config.js";

let client = null;

export function getSupabaseBrowserClient() {
    if (client) return client;
    client = createClient(
        authConfig.supabase.url,
        authConfig.supabase.publishableKey,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );
    return client;
}

export async function ensureSupabaseSession(auth) {
    const sb = getSupabaseBrowserClient();
    const accessToken = auth?.getToken?.();
    const refreshToken = auth?.getRefreshToken?.();
    if (!accessToken || !refreshToken) throw new Error("Authenticated Supabase session is unavailable.");
    const result = await sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (result.error) throw result.error;
    return sb;
}

export default getSupabaseBrowserClient;
