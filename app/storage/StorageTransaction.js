/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * StorageTransaction
 * ============================================================
 */

export default class StorageTransaction {

    constructor(provider) {

        if (!provider) {

            throw new Error(
                "StorageTransaction requires a provider."
            );

        }

        this.provider =
            provider;

        this.active = true;

        this.operations = [];

    }


    assertActive() {

        if (!this.active) {

            throw new Error(
                "Storage transaction is no longer active."
            );

        }

    }


    async get(key) {

        this.assertActive();

        return this.provider.get(
            key
        );

    }


    async set(key, value) {

        this.assertActive();

        this.operations.push({
            type: "set",
            key,
            value
        });

        return this.provider.set(
            key,
            value
        );

    }


    async delete(key) {

        this.assertActive();

        this.operations.push({
            type: "delete",
            key
        });

        return this.provider.delete(
            key
        );

    }


    async has(key) {

        this.assertActive();

        return this.provider.has(
            key
        );

    }


    async commit() {

        this.assertActive();

        this.active = false;

        return true;

    }


    async rollback() {

        this.active = false;

        /*
         * Generic storage providers cannot guarantee
         * rollback after individual operations.
         *
         * Native database providers should override
         * transaction() with true atomic transactions.
         */

        return false;

    }


    async execute(callback) {

        this.assertActive();

        try {

            const result =
                await callback(this);

            await this.commit();

            return result;

        } catch (error) {

            await this.rollback();

            throw error;

        }

    }

}
