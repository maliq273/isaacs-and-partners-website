/**
 * Isaacs & Partners
 * Authentication Configuration
 *
 * Single source of truth for client-side authentication settings.
 *
 * IMPORTANT:
 * - Authentication services must consume this configuration.
 * - No authentication endpoint should be hard-coded elsewhere.
 * - Secrets, passwords and private credentials must NEVER be stored here.
 * - Endpoint paths are same-origin by design for the production website.
 */

const API_BASE = "/api";
const AUTH_BASE = `${API_BASE}/auth`;

const authConfig = Object.freeze({

  api: Object.freeze({
    baseUrl: API_BASE,
    authBaseUrl: AUTH_BASE,
  }),

  endpoints: Object.freeze({
    login: `${AUTH_BASE}/login`,
    logout: `${AUTH_BASE}/logout`,
    session: `${AUTH_BASE}/session`,
    refresh: `${AUTH_BASE}/refresh`,
    me: `${AUTH_BASE}/me`,
  }),

  storageKeys: Object.freeze({
    session: "isaacs_partners.auth.session",
    user: "isaacs_partners.auth.user",
    token: "isaacs_partners.auth.token",
    expiresAt: "isaacs_partners.auth.expiresAt",
    rememberMe: "isaacs_partners.auth.rememberMe",
  }),

  session: Object.freeze({
    restoreOnStartup: true,
    persistUser: true,
    persistToken: true,
    sessionDuration: 8 * 60 * 60 * 1000,
    rememberMeDuration: 30 * 24 * 60 * 60 * 1000,
    refreshBeforeExpiry: 5 * 60 * 1000,
    activityThrottle: 30 * 1000,
  }),

  request: Object.freeze({
    timeout: 15000,
  }),

  security: Object.freeze({
    useBearerToken: true,
    credentials: "same-origin",
    allowCrossOrigin: false,
    allowInsecureHttp: false,
  }),

});

export default authConfig;
