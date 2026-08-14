/**
 * SystemEvents
 * ------------------------------------------------------------
 * Application/system lifecycle events.
 */

export const SystemEvents = Object.freeze({
    APPLICATION_STARTED:
        "system.application.started",

    APPLICATION_READY:
        "system.application.ready",

    APPLICATION_STOPPING:
        "system.application.stopping",

    APPLICATION_STOPPED:
        "system.application.stopped",

    DATABASE_CONNECTED:
        "system.database.connected",

    DATABASE_DISCONNECTED:
        "system.database.disconnected",

    DATABASE_MIGRATION_STARTED:
        "system.database.migration.started",

    DATABASE_MIGRATION_COMPLETED:
        "system.database.migration.completed",

    DATABASE_MIGRATION_FAILED:
        "system.database.migration.failed",

    BACKUP_STARTED:
        "system.backup.started",

    BACKUP_COMPLETED:
        "system.backup.completed",

    BACKUP_FAILED:
        "system.backup.failed",

    RESTORE_STARTED:
        "system.restore.started",

    RESTORE_COMPLETED:
        "system.restore.completed",

    RESTORE_FAILED:
        "system.restore.failed",

    STORAGE_ERROR:
        "system.storage.error",

    CONFIGURATION_LOADED:
        "system.configuration.loaded",

    CONFIGURATION_ERROR:
        "system.configuration.error"
});

export default SystemEvents;
