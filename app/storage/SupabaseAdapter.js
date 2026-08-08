/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SupabaseAdapter
 * ============================================================
 */

import StorageProvider
    from "./StorageProvider.js";

export default class SupabaseAdapter
    extends StorageProvider {

    constructor(options = {}) {

        super({
            ...options,
            name: "SupabaseAdapter"
        });

        this.client =
            options.client ?? null;

        this.table =
            options.table ??
            "application_storage";

        this.keyColumn =
            options.keyColumn ??
            "key";

        this.valueColumn =
            options.valueColumn ??
            "value";

    }


    async initialize() {

        if (!this.client) {

            throw new Error(
                "SupabaseAdapter requires a Supabase client."
            );

        }

        this.initialized = true;

        return this;

    }


    async get(key) {

        this.assertInitialized();

        const {
            data,
            error
        } =
            await this.client
                .from(this.table)
                .select(this.valueColumn)
                .eq(this.keyColumn, key)
                .maybeSingle();

        if (error) {

            throw error;

        }

        return data
            ? data[this.valueColumn]
            : null;

    }


    async set(key, value) {

        this.assertInitialized();

        const {
            error
        } =
            await this.client
                .from(this.table)
                .upsert({
                    [this.keyColumn]: key,
                    [this.valueColumn]: value
                });

        if (error) {

            throw error;

        }

        return value;

    }


    async delete(key) {

        this.assertInitialized();

        const {
            error
        } =
            await this.client
                .from(this.table)
                .delete()
                .eq(
                    this.keyColumn,
                    key
                );

        if (error) {

            throw error;

        }

        return true;

    }


    async has(key) {

        return (
            await this.get(key)
        ) !== null;

    }


    async clear() {

        this.assertInitialized();

        const {
            error
        } =
            await this.client
                .from(this.table)
                .delete()
                .not(
                    this.keyColumn,
                    "is",
                    null
                );

        if (error) {

            throw error;

        }

    }


    async keys() {

        this.assertInitialized();

        const {
            data,
            error
        } =
            await this.client
                .from(this.table)
                .select(this.keyColumn);

        if (error) {

            throw error;

        }

        return (
            data ?? []
        ).map(
            row =>
                row[this.keyColumn]
        );

    }


    // =========================================================
    // FUTURE INSERT
    // Supabase:
    // Authentication
    // RLS
    // Company isolation
    // User isolation
    // Audit logging
    // Realtime synchronization
    // =========================================================

}
