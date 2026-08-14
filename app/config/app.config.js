/**
 * Isaacs and Partners
 * Application Configuration
 */

const appConfig = Object.freeze({
    name: "Isaacs and Partners",
    legalName: "Isaacs and Partners Pty(Ltd)",
    tradingName: "Isaacs and Partners",

    registrationNumber: "2025/474736/07",
    taxNumber: "9293784261",
    vatRegistered: false,

    version: "1.0.0",
    environment:
        typeof window !== "undefined" &&
        window.location.hostname === "localhost"
            ? "development"
            : "production",

    locale: "en-ZA",
    timezone: "Africa/Johannesburg",
    currency: "ZAR",

    contact: Object.freeze({
        email: "info@isaacsandpartners.online",
        telephone: "+2771 883 1097",
        website: "https://www.isaacsandpartners.online",
    }),

    addresses: Object.freeze({
        business:
            "13 Middel Street, Kempenville, Cape Town, 7530",
        postal:
            "Unit 215, River Hamlet, 52 Gie Rd, Milnerton Rural, 7441",
    }),

    features: Object.freeze({
        consultation: true,
        matters: true,
        clients: true,
        documents: true,
        bookings: true,
        workflows: true,
        knowledgebase: true,
        reporting: true,
        notifications: true,
        ai: true,
        portal: true,
        bundleGeneration: true,
    }),

    storage: Object.freeze({
        primary: "sqlite",
        fallback: "indexeddb",
        session: "sessionStorage",
        cache: "localStorage",
    }),

    pagination: Object.freeze({
        defaultPageSize: 25,
        maxPageSize: 100,
    }),

    dateFormats: Object.freeze({
        display: "DD/MM/YYYY",
        api: "YYYY-MM-DD",
        datetime: "YYYY-MM-DD HH:mm:ss",
    }),
});

export default appConfig;
