/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * EncryptionProvider
 * ------------------------------------------------------------
 * Web Crypto based encryption provider.
 * ============================================================
 */

export default class EncryptionProvider {

    constructor(options = {}) {

        this.algorithm =
            options.algorithm ??
            "AES-GCM";

        this.keyLength =
            options.keyLength ??
            256;

        this.iterations =
            options.iterations ??
            100000;

        this.key = null;

        // =====================================================
        // FUTURE INSERT
        // Enterprise key-management provider
        // Environment-specific encryption keys
        // Key rotation
        // =====================================================

    }


    async generateKey() {

        this.key =
            await crypto.subtle.generateKey(
                {
                    name: this.algorithm,
                    length: this.keyLength
                },
                true,
                [
                    "encrypt",
                    "decrypt"
                ]
            );

        return this.key;

    }


    async importKey(rawKey) {

        this.key =
            await crypto.subtle.importKey(
                "raw",
                rawKey,
                {
                    name: this.algorithm
                },
                false,
                [
                    "encrypt",
                    "decrypt"
                ]
            );

        return this.key;

    }


    async exportKey() {

        if (!this.key) {

            throw new Error(
                "Encryption key is not initialized."
            );

        }

        return crypto.subtle.exportKey(
            "raw",
            this.key
        );

    }


    async encrypt(value) {

        if (!this.key) {

            await this.generateKey();

        }

        const encoder =
            new TextEncoder();

        const data =
            encoder.encode(
                JSON.stringify(value)
            );

        const iv =
            crypto.getRandomValues(
                new Uint8Array(12)
            );

        const encrypted =
            await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv
                },
                this.key,
                data
            );

        return {

            iv: Array.from(iv),

            data: Array.from(
                new Uint8Array(
                    encrypted
                )
            )

        };

    }


    async decrypt(payload) {

        if (!this.key) {

            throw new Error(
                "Encryption key is not initialized."
            );

        }

        const iv =
            new Uint8Array(
                payload.iv
            );

        const encrypted =
            new Uint8Array(
                payload.data
            );

        const decrypted =
            await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv
                },
                this.key,
                encrypted
            );

        const decoder =
            new TextDecoder();

        return JSON.parse(
            decoder.decode(decrypted)
        );

    }


    // =========================================================
    // FUTURE INSERT
    // Password-derived keys
    // Key rotation
    // Secure key storage
    // Hardware-backed keys
    // =========================================================

}
