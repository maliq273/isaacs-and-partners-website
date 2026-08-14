/**
 * AuditFunctions
 * ------------------------------------------------------------
 * Standardises audit metadata before it is persisted.
 */

import {
    generateId,
    nowISO,
    serializeJSON
} from "./DatabaseFunctions.js";

export function createAuditRecord({
    actorId = null,
    action,
    entityType,
    entityId = null,
    before = null,
    after = null,
    metadata = {}
} = {}) {
    if (!action) {
        throw new Error(
            "Audit action is required"
        );
    }

    if (!entityType) {
        throw new Error(
            "Audit entityType is required"
        );
    }

    return {
        id: generateId(),
        actorId,
        action,
        entityType,
        entityId,
        before: serializeJSON(before),
        after: serializeJSON(after),
        metadata: serializeJSON(metadata, "{}"),
        createdAt: nowISO()
    };
}

export function createAuditChanges(
    before = {},
    after = {}
) {
    const keys = new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {})
    ]);

    const changes = {};

    for (const key of keys) {
        if (
            JSON.stringify(
                before?.[key]
            ) !==
            JSON.stringify(
                after?.[key]
            )
        ) {
            changes[key] = {
                before:
                    before?.[key] ??
                    null,
                after:
                    after?.[key] ??
                    null
            };
        }
    }

    return changes;
}

export default {
    createAuditRecord,
    createAuditChanges
};
