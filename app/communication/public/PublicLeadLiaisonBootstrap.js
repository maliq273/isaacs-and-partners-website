/*
 * Public AI Liaison bootstrap.
 *
 * The homepage keeps the AI Liaison as a module, but this bootstrap also
 * provides a cache-busted retry path. That prevents a stale module cache or
 * a transient module load failure from silently removing the public AI button.
 */
(function bootstrapPublicAiLiaison() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const INSTANCE_KEY = "__IP_PUBLIC_AI_LIAISON__";
    const MODULE_URL = "./PublicLeadLiaison.js?v=20260906-ai";
    const MAX_ATTEMPTS = 3;

    async function boot(attempt = 1) {
        if (window[INSTANCE_KEY]) return;

        try {
            await import(MODULE_URL);
            if (!window[INSTANCE_KEY] && attempt < MAX_ATTEMPTS) {
                setTimeout(() => boot(attempt + 1), 350 * attempt);
            }
        } catch (error) {
            console.error(`[Public AI Liaison] module load failed (attempt ${attempt}/${MAX_ATTEMPTS})`, error);
            if (attempt < MAX_ATTEMPTS) {
                setTimeout(() => boot(attempt + 1), 500 * attempt);
            }
        }
    }

    const start = () => {
        if (window[INSTANCE_KEY]) return;
        boot();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();
