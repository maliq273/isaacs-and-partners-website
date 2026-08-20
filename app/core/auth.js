/**
 * Isaacs & Partners
 * Authentication & Session Manager
 *
 * Central authentication/session coordinator.
 *
 * Responsibilities:
 * - Maintain authenticated user
 * - Restore existing session
 * - Login/logout coordination
 * - Session expiration
 * - Synchronise auth state
 * - Emit authentication events
 *
 * This module does NOT own UI.
 * This module does NOT directly manipulate pages.
 * This module uses the core storage/state/event architecture.
 */

import { appState } from "./state.js";
import { eventBus } from "./events.js";
import { storage } from "./storage.js";

const SESSION_KEY = "current_session";
const USER_KEY = "current_user";

class AuthManager {

  constructor() {
    this.initialised = false;
    this.authenticated = false;
    this.user = null;
    this.session = null;
    this.expiryTimer = null;
  }

  /**
   * Initialise authentication manager.
   */
  async initialise() {

    if (this.initialised) {
      return this;
    }

    this.initialised = true;

    await this.restoreSession();

    return this;
  }

  /**
   * Alias.
   */
  async init() {
    return this.initialise();
  }

  /**
   * Restore previously persisted session.
   */
  async restoreSession() {

    try {

      const session =
        await storage.get(
          SESSION_KEY,
          null
        );

      const user =
        await storage.get(
          USER_KEY,
          null
        );

      if (!session || !user) {
        this.clearAuthState();
        return null;
      }

      if (
        this.isSessionExpired(session)
      ) {
        await this.logout({
          reason: "expired",
          silent: true
        });

        return null;
      }

      this.session = session;
      this.user = user;
      this.authenticated = true;

      this.syncState();

      this.startExpiryTimer();

      eventBus.emit(
        "auth:restored",
        {
          user,
          session
        }
      );

      return {
        user,
        session
      };

    } catch (error) {

      console.error(
        "[Auth] Session restoration failed:",
        error
      );

      this.clearAuthState();

      return null;
    }
  }

  /**
   * Establish authenticated session.
   *
   * The actual credential verification will later be
   * supplied by the API/backend authentication adapter.
   */
  async establishSession(
    user,
    session
  ) {

    if (!user) {
      throw new TypeError(
        "Authenticated user is required."
      );
    }

    if (!session) {
      throw new TypeError(
        "Authenticated session is required."
      );
    }

    if (
      this.isSessionExpired(session)
    ) {
      throw new Error(
        "Cannot establish an expired session."
      );
    }

    this.user = user;
    this.session = session;
    this.authenticated = true;

    await storage.set(
      USER_KEY,
      user
    );

    await storage.set(
      SESSION_KEY,
      session
    );

    this.syncState();

    this.startExpiryTimer();

    eventBus.emit(
      "auth:login",
      {
        user,
        session
      }
    );

    return {
      user,
      session
    };
  }

  /**
   * Logout current user.
   */
  async logout({
    reason = "logout",
    silent = false
  } = {}) {

    this.stopExpiryTimer();

    const previousUser =
      this.user;

    this.clearAuthState();

    await storage.remove(
      USER_KEY
    );

    await storage.remove(
      SESSION_KEY
    );

    if (!silent) {

      eventBus.emit(
        "auth:logout",
        {
          user: previousUser,
          reason
        }
      );
    }

    if (reason === "expired") {

      eventBus.emit(
        "auth:expired",
        {
          user: previousUser
        }
      );
    }

    return true;
  }

  /**
   * Synchronise authentication state
   * with the central StateStore.
   */
  syncState() {

    appState.set(
      "auth.authenticated",
      this.authenticated
    );

    appState.set(
      "auth.user",
      this.user
    );

    appState.set(
      "auth.session",
      this.session
    );
  }

  /**
   * Clear in-memory authentication state.
   */
  clearAuthState() {

    this.authenticated = false;
    this.user = null;
    this.session = null;

    appState.set(
      "auth.authenticated",
      false
    );

    appState.set(
      "auth.user",
      null
    );

    appState.set(
      "auth.session",
      null
    );
  }

  /**
   * Check whether a session is expired.
   */
  isSessionExpired(session) {

    if (!session) {
      return true;
    }

    if (!session.expiresAt) {
      return false;
    }

    const expiry =
      new Date(
        session.expiresAt
      ).getTime();

    if (
      Number.isNaN(expiry)
    ) {
      return true;
    }

    return Date.now() >= expiry;
  }

  /**
   * Start automatic expiry handling.
   */
  startExpiryTimer() {

    this.stopExpiryTimer();

    if (
      !this.session ||
      !this.session.expiresAt
    ) {
      return;
    }

    const expiry =
      new Date(
        this.session.expiresAt
      ).getTime();

    const delay =
      expiry - Date.now();

    if (delay <= 0) {
      this.logout({
        reason: "expired"
      });

      return;
    }

    this.expiryTimer =
      setTimeout(
        () => {
          this.logout({
            reason: "expired"
          });
        },
        delay
      );
  }

  /**
   * Stop expiry timer.
   */
  stopExpiryTimer() {

    if (this.expiryTimer) {

      clearTimeout(
        this.expiryTimer
      );

      this.expiryTimer = null;
    }
  }

  /**
   * Return current user.
   */
  getUser() {
    return this.user;
  }

  /**
   * Return current session.
   */
  getSession() {
    return this.session;
  }

  /**
   * Determine authentication status.
   */
  isAuthenticated() {
    return this.authenticated;
  }

  /**
   * Return authentication status.
   */
  getStatus() {

    return {
      authenticated:
        this.authenticated,

      user:
        this.user,

      session:
        this.session,

      expired:
        this.session
          ? this.isSessionExpired(
              this.session
            )
          : true
    };
  }

  /**
   * Destroy manager.
   */
  destroy() {

    this.stopExpiryTimer();

    this.clearAuthState();

    this.initialised = false;
  }
}

export const auth =
  new AuthManager();

export {
  AuthManager
};

export default auth;