/**
 * Isaacs and Partners
 * Environment Configuration
 *
 * Runtime environment detection.
 *
 * Secrets must never be hard-coded in this file.
 * Production credentials must be supplied through the
 * deployment environment or secure backend configuration.
 */

const isBrowser =
    typeof window !== "undefined";

const hostname =
    isBrowser
        ? window.location.hostname
        : "";

const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1";

const isProduction =
    !isLocalhost &&
    hostname !== "";

const environment = Object.freeze({
    name: isProduction
        ? "production"
        : "development",

    isProduction,
    isDevelopment: !isProduction,
    isBrowser,

    hostname,

    baseUrl: isBrowser
        ? window.location.origin
        : "",

    apiUrl:
        isBrowser
            ? `${window.location.origin}/api`
            : "/api",

    githubPages:
        hostname.includes(
            "github.io"
        ),

    secure:
        isBrowser
            ? window.location.protocol === "https:"
            : false,

    debug:
        !isProduction,

    allowMockData:
        !isProduction,

    allowTestMode:
        !isProduction,

    strictValidation:
        isProduction,

    strictSecurity:
        isProduction,

    logging: Object.freeze({
        level: isProduction
            ? "warn"
            : "debug",

        enableConsole:
            true,

        enableRemote:
            false,
    }),
});

export function getEnvironment() {
    return environment;
}

export function isProductionEnvironment() {
    return environment.isProduction;
}

export function isDevelopmentEnvironment() {
    return environment.isDevelopment;
}

export default environment;
