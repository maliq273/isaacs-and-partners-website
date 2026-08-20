/**
 * Isaacs & Partners
 * Authentication Configuration
 */

const authConfig = Object.freeze({
  endpoints: Object.freeze({
    login: "/auth/login",
    logout: "/auth/logout",
    session: "/auth/session",
    refresh: "/auth/refresh",
    me: "/auth/me",
  }),

  storageKeys: Object.freeze({
    token: "auth_token",
    refreshToken: "auth_refresh_token",
    session: "auth_session",
    user: "current_user",
  }),

  session: Object.freeze({
    restoreOnStartup: true,
    persistUser: true,
    persistToken: true,
  }),

  security: Object.freeze({
    useBearerToken: true,
    credentials: "same-origin",
  }),
});

export default authConfig;