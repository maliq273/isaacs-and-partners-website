/**
 * Compatibility facade for the central application state store.
 *
 * The implementation lives in state-store.js. This facade preserves
 * the canonical state.js import path and exposes both `state` and
 * the legacy `appState` name used by the frontend adapter.
 */

import stateStore, {
    StateStore,
    DEFAULT_STATE,
} from "./state-store.js";

export const state = stateStore;
export const appState = stateStore;

export {
    StateStore,
    DEFAULT_STATE,
};

export default stateStore;
