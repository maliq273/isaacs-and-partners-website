/**
 * Isaacs & Partners
 * Integration Data Service
 *
 * Reads provider health and durable integration events from Supabase for
 * authenticated Super Admin sessions. Provider secrets are never exposed.
 */

import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const PROVIDERS_TABLE = "integration_providers";
const EVENTS_TABLE = "integration_events";

class IntegrationDataService {
    constructor() {
        this.baseUrl = `${authConfig.supabase.url}/rest/v1`;
        this.publishableKey = authConfig.supabase.publishableKey;
        this.timeout = authConfig.request.timeout;
    }

    async request(path, options = {}) {
        await auth.initialise();

        if (!auth.isAuthenticated()) {
            const error = new Error("An authenticated session is required.");
            error.code = "AUTHENTICATION_REQUIRED";
            throw error;
        }

        const token = auth.getToken();
        if (!token) {
            const error = new Error("Authentication token is unavailable.");
            error.code = "AUTH_TOKEN_MISSING";
            throw error;
        }

        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), this.timeout) : null;

        try {
            const response = await fetch(`${this.baseUrl}/${path}`, {
                ...options,
                headers: {
                    Accept: "application/json",
                    apikey: this.publishableKey,
                    Authorization: `Bearer ${token}`,
                    ...(options.headers || {})
                },
                signal: controller?.signal
            });

            const raw = await response.text();
            let data = [];
            try {
                data = raw ? JSON.parse(raw) : [];
            } catch {
                data = [];
            }

            if (!response.ok) {
                const error = new Error(
                    data?.message || data?.hint || `Integration request failed (${response.status}).`
                );
                error.status = response.status;
                error.code = `INTEGRATION_HTTP_${response.status}`;
                error.details = data;
                throw error;
            }

            return data;
        } catch (error) {
            if (error?.name === "AbortError") {
                const timeoutError = new Error("Integration request timed out.");
                timeoutError.code = "INTEGRATION_REQUEST_TIMEOUT";
                throw timeoutError;
            }
            throw error;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    async listProviders() {
        const params = new URLSearchParams({
            select: "provider_key,display_name,enabled,status,last_success_at,last_error,metadata,updated_at",
            order: "provider_key.asc"
        });
        return this.request(`${PROVIDERS_TABLE}?${params.toString()}`);
    }

    async listRecentEvents(limit = 20) {
        const params = new URLSearchParams({
            select: "id,event_type,entity_type,entity_id,operation,source,status,attempts,available_at,processed_at,last_error,correlation_id,created_at,updated_at",
            order: "created_at.desc",
            limit: String(Math.max(1, Math.min(Number(limit) || 20, 100)))
        });
        return this.request(`${EVENTS_TABLE}?${params.toString()}`);
    }

    async getControlPlaneStatus() {
        const [providers, events] = await Promise.all([
            this.listProviders(),
            this.listRecentEvents(25)
        ]);

        const pending = events.filter(event => event.status === "PENDING").length;
        const failed = events.filter(event => event.status === "FAILED").length;
        const processing = events.filter(event => event.status === "PROCESSING").length;

        return {
            providers,
            events,
            summary: {
                providerCount: providers.length,
                connectedProviders: providers.filter(provider => provider.status === "CONNECTED").length,
                configuredProviders: providers.filter(provider => provider.status !== "NOT_CONFIGURED").length,
                pendingEvents: pending,
                processingEvents: processing,
                failedEvents: failed
            }
        };
    }
}

export const integrationData = new IntegrationDataService();
export { IntegrationDataService };
export default integrationData;
