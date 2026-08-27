export const CONTROL_PLANE_BATCH_2 = Object.freeze({
    assignments: "/app/dashboard/assignments.html",
    matters: "/app/dashboard/matters.html",
    staffAdmin: "/app/dashboard/staff-admin.html",
    superAdmin: "/app/dashboard/super-admin.html",
    permissions: [
        "manage_assignments",
        "assign_cases",
        "assign_matters"
    ]
});

export function isValidUuid(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function requireUuid(value, label = "ID") {
    if (!isValidUuid(value)) throw new Error(`${label} must be a valid UUID.`);
    return value;
}
