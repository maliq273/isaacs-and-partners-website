import ApplicationException from "./ApplicationException.js";

/**
 * StorageException
 * ------------------------------------------------------------
 * Local storage, IndexedDB, SQLite, Supabase, backup,
 * encryption, migration, or restore failure.
 */

export class StorageException extends ApplicationException {
    constructor(
        message = "Storage operation failed",
        options = {}
    ) {
        super(message, {
            ...options,
            code:
                options.code ||
                "STORAGE_ERROR",
            status:
                options.status || 500
        });

        this.name =
            "StorageException";
    }
}

export default StorageException;
