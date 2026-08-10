/**
 * Isaacs & Partners
 * Theme Manager
 *
 * Supports:
 * - light
 * - dark
 * - system
 *
 * Persists the user's preference and keeps
 * the document state synchronised.
 */

import storage from "./storage.js";

const THEME_KEY =
    "isaacs_theme";

class ThemeManager {
    constructor(options = {}) {
        this.storage =
            options.storage || storage;

        this.root =
            options.root ||
            document.documentElement;

        this.defaultTheme =
            options.defaultTheme ||
            "system";

        this.allowedThemes = [
            "light",
            "dark",
            "system"
        ];
    }

    init() {
        const saved =
            this.storage.get(
                THEME_KEY
            );

        const theme =
            this.isValidTheme(saved)
                ? saved
                : this.defaultTheme;

        this.apply(theme);

        this.watchSystemTheme();

        return theme;
    }

    set(theme) {
        if (
            !this.isValidTheme(theme)
        ) {
            throw new Error(
                `Invalid theme: ${theme}`
            );
        }

        this.storage.set(
            THEME_KEY,
            theme
        );

        this.apply(theme);

        return theme;
    }

    get() {
        const saved =
            this.storage.get(
                THEME_KEY
            );

        return this.isValidTheme(saved)
            ? saved
            : this.defaultTheme;
    }

    getResolvedTheme() {
        const theme = this.get();

        if (theme !== "system") {
            return theme;
        }

        return this.getSystemTheme();
    }

    apply(theme) {
        const resolved =
            theme === "system"
                ? this.getSystemTheme()
                : theme;

        this.root.dataset.theme =
            resolved;

        this.root.classList.toggle(
            "dark",
            resolved === "dark"
        );

        this.root.classList.toggle(
            "light",
            resolved === "light"
        );

        this.root.style.colorScheme =
            resolved;

        this.root.dispatchEvent(
            new CustomEvent(
                "themechange",
                {
                    detail: {
                        theme,
                        resolved
                    }
                }
            )
        );
    }

    getSystemTheme() {
        if (
            typeof window ===
            "undefined" ||
            !window.matchMedia
        ) {
            return "light";
        }

        return window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches
            ? "dark"
            : "light";
    }

    watchSystemTheme() {
        if (
            typeof window ===
                "undefined" ||
            !window.matchMedia
        ) {
            return;
        }

        const media =
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            );

        const handler = () => {
            if (
                this.get() ===
                "system"
            ) {
                this.apply("system");
            }
        };

        if (
            media.addEventListener
        ) {
            media.addEventListener(
                "change",
                handler
            );
        } else {
            media.addListener(handler);
        }
    }

    toggle() {
        const current =
            this.getResolvedTheme();

        return this.set(
            current === "dark"
                ? "light"
                : "dark"
        );
    }

    isValidTheme(theme) {
        return this.allowedThemes.includes(
            theme
        );
    }
}

export const theme =
    new ThemeManager();

export {
    ThemeManager
};

export default theme;
