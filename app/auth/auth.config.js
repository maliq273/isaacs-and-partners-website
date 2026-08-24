/**
 * Isaacs & Partners
 * Supabase Authentication Configuration
 *
 * Client-side configuration only.
 * The Supabase publishable key is intentionally usable in the browser.
 * NEVER place the PostgreSQL password/service-role key in this file.
 */

const SUPABASE_URL = "https://aglobzjtstbfwcsdhvmp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kOZDY5O3NvuA_ASccqlP4A_AypDlgwr";
const SUPABASE_AUTH_BASE = `${SUPABASE_URL}/auth/v1`;

const authConfig = Object.freeze({
    provider: "supabase",

    supabase: Object.freeze({
        url: SUPABASE_URL,
        publishableKey: SUPABASE_PUBLISHABLE_KEY,
        authBaseUrl: SUPABASE_AUTH_BASE
    }),

    api: Object.freeze({
        baseUrl: SUPABASE_URL,
        authBaseUrl: SUPABASE_AUTH_BASE
    }),

    endpoints: Object.freeze({
        login: `${SUPABASE_AUTH_BASE}/token?grant_type=password`,
        signup: `${SUPABASE_AUTH_BASE}/signup`,
        logout: `${SUPABASE_AUTH_BASE}/logout`,
        session: `${SUPABASE_AUTH_BASE}/user`,
        refresh: `${SUPABASE_AUTH_BASE}/token?grant_type=refresh_token`,
        me: `${SUPABASE_AUTH_BASE}/user`
    }),

    storageKeys: Object.freeze({
        session: "isaacs_partners.auth.session",
        user: "isaacs_partners.auth.user",
        token: "isaacs_partners.auth.token",
        refreshToken: "isaacs_partners.auth.refreshToken",
        expiresAt: "isaacs_partners.auth.expiresAt",
        rememberMe: "isaacs_partners.auth.rememberMe"
    }),

    session: Object.freeze({
        restoreOnStartup: true,
        persistUser: true,
        persistToken: true,
        sessionDuration: 60 * 60 * 1000,
        rememberMeDuration: 30 * 24 * 60 * 60 * 1000,
        refreshBeforeExpiry: 5 * 60 * 1000,
        activityThrottle: 30 * 1000
    }),

    request: Object.freeze({
        timeout: 15000
    }),

    security: Object.freeze({
        useBearerToken: true,
        credentials: "omit",
        allowCrossOrigin: true,
        allowInsecureHttp: false
    })
});

export default authConfig;
