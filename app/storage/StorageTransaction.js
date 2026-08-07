/**
 * ============================================================
 * FILE: StorageTransaction.js
 * ID: STO-010
 * LOCATION: app/storage/StorageTransaction.js
 * ============================================================
 */

export default class StorageTransaction {

    constructor() {

        this.operations = [];

        this.active = false;

    }

    /*=====================================================
        TX-001
        Begin
    =====================================================*/

    begin() {

        this.active = true;

        this.operations = [];

    }

    /*=====================================================
        TX-002
        Add
    =====================================================*/

    add(operation) {

        this.operations.push(operation);

    }

    /*=====================================================
        TX-003
        Commit
    =====================================================*/

    async commit() {

        for (const op of this.operations) {

            await op();

        }

        this.active = false;

    }

    /*=====================================================
        TX-004
        Rollback
    =====================================================*/

    rollback() {

        this.operations = [];

        this.active = false;

    }

}
