import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const STAFF_TABLE = "staff";
const PROFILES_TABLE = "profiles";
const PERMISSIONS_TABLE = "staff_permissions";
const CATALOG_TABLE = "permission_catalog";

class StaffAdminDataService {
    constructor() {
        this.baseUrl = `${authConfig.supabase.url}/rest/v1`;
        this.publishableKey = authConfig.supabase.publishableKey;
        this.timeout = authConfig.request.timeout;
    }

    async request(path = "", options = {}) {
        await auth.initialise();

        if (!auth.isAuthenticated()) {
            throw this.error(
                "AUTHENTICATION_REQUIRED",
                "An authenticated session is required."
            );
        }

        const token = auth.getToken();

        const controller =
            typeof AbortController !== "undefined"
                ? new AbortController()
                : null;

        const timer = controller
            ? setTimeout(() => controller.abort(), this.timeout)
            : null;

        try {
            const headers = {
                Accept: "application/json",
                "Content-Type": "application/json",
                apikey: this.publishableKey,
                Authorization: `Bearer ${token}`
            };

            if (
                options.method === "POST" ||
                options.method === "PATCH" ||
                options.method === "DELETE"
            ) {
                headers.Prefer = "return=representation";
            }

            const response = await fetch(
                `${this.baseUrl}/${path}`,
                {
                    ...options,
                    headers: {
                        ...headers,
                        ...(options.headers || {})
                    },
                    signal: controller?.signal
                }
            );

            const raw = await response.text();

            let data = [];

            try {
                data = raw ? JSON.parse(raw) : [];
            } catch {
                data = [];
            }

            if (!response.ok) {
                const message =
                    data?.message ||
                    data?.hint ||
                    data?.error_description ||
                    data?.details ||
                    `Staff request failed (${response.status}).`;

                throw this.error(
                    `STAFF_HTTP_${response.status}`,
                    message,
                    response.status,
                    data
                );
            }

            return data;

        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    }

    error(code, message, status = null, details = null) {
        const error = new Error(message);

        error.code = code;
        error.status = status;
        error.details = details;

        return error;
    }

    async list() {
        const params = new URLSearchParams({
            select:
                "id,user_id,employee_number,department,job_title,is_active,created_at,updated_at",
            order: "created_at.desc"
        });

        const staff = await this.request(
            `${STAFF_TABLE}?${params.toString()}`
        );

        return this.enrichStaffFromProfiles(staff);
    }

    async enrichStaffFromProfiles(staff) {
        if (!Array.isArray(staff) || !staff.length) {
            return [];
        }

        const userIds = staff
            .map(item => item.user_id)
            .filter(Boolean);

        if (!userIds.length) {
            return staff;
        }

        const params = new URLSearchParams({
            select:
                "id,email,first_name,last_name,role,is_active",
            id: `in.(${userIds.join(",")})`
        });

        const profiles = await this.request(
            `${PROFILES_TABLE}?${params.toString()}`
        );

        const byId = new Map(
            profiles.map(profile => [
                String(profile.id),
                profile
            ])
        );

        return staff.map(item => ({
            ...item,
            profiles:
                byId.get(String(item.user_id)) || null
        }));
    }

    async getStaff(id) {
        if (!id) {
            throw this.error(
                "STAFF_ID_REQUIRED",
                "Staff ID is required."
            );
        }

        const params = new URLSearchParams({
            select: "*",
            id: `eq.${id}`,
            limit: "1"
        });

        const rows = await this.request(
            `${STAFF_TABLE}?${params.toString()}`
        );

        if (!rows.length) {
            throw this.error(
                "STAFF_NOT_FOUND",
                "Staff member could not be found."
            );
        }

        return rows[0];
    }

    async getProfile(userId) {
        if (!userId) {
            return null;
        }

        const params = new URLSearchParams({
            select:
                "id,email,first_name,last_name,phone,role,is_active",
            id: `eq.${userId}`,
            limit: "1"
        });

        const rows = await this.request(
            `${PROFILES_TABLE}?${params.toString()}`
        );

        return rows[0] || null;
    }

    async getPermissions(staffId) {
        const params = new URLSearchParams({
            select:
                "id,staff_id,permission_key,access_scope,is_enabled,created_at,updated_at",
            staff_id: `eq.${staffId}`,
            order: "permission_key.asc"
        });

        return this.request(
            `${PERMISSIONS_TABLE}?${params.toString()}`
        );
    }

    async getPermissionCatalog() {
        const params = new URLSearchParams({
            select:
                "permission_key,permission_name,description,category",
            order: "category.asc,permission_key.asc"
        });

        return this.request(
            `${CATALOG_TABLE}?${params.toString()}`
        );
    }

    async getStaffForEdit(id) {
        const staff = await this.getStaff(id);

        const [
            profile,
            permissions,
            catalog
        ] = await Promise.all([
            this.getProfile(staff.user_id),
            this.getPermissions(id),
            this.getPermissionCatalog()
        ]);

        return {
            staff,
            profile,
            permissions,
            catalog
        };
    }

    async createStaffAccount(payload) {
        const endpoint =
            `${authConfig.supabase.url}/functions/v1/admin-create-staff`;

        await auth.initialise();

        if (!auth.isAuthenticated()) {
            throw this.error(
                "AUTHENTICATION_REQUIRED",
                "Please sign in again."
            );
        }

        const response = await fetch(
            endpoint,
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    apikey: this.publishableKey,
                    Authorization:
                        `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify(payload)
            }
        );

        const raw = await response.text();

        let data = {};

        try {
            data = raw ? JSON.parse(raw) : {};
        } catch {
            data = {};
        }

        if (!response.ok) {
            throw this.error(
                `STAFF_PROVISION_${response.status}`,
                data?.error ||
                    "Staff account could not be created.",
                response.status,
                data
            );
        }

        return data;
    }

    async updateStaff(id, changes) {
        if (!id) {
            throw this.error(
                "STAFF_ID_REQUIRED",
                "Staff ID is required."
            );
        }

        const allowed = [
            "employee_number",
            "department",
            "job_title",
            "is_active"
        ];

        const body = Object.fromEntries(
            Object.entries(changes).filter(
                ([key]) => allowed.includes(key)
            )
        );

        if (!Object.keys(body).length) {
            throw this.error(
                "NO_STAFF_CHANGES",
                "No staff changes were supplied."
            );
        }

        const params = new URLSearchParams({
            id: `eq.${id}`
        });

        return this.request(
            `${STAFF_TABLE}?${params.toString()}`,
            {
                method: "PATCH",
                body: JSON.stringify(body)
            }
        );
    }

    async updateProfile(userId, changes) {
        if (!userId) {
            throw this.error(
                "USER_ID_REQUIRED",
                "User ID is required."
            );
        }

        const allowed = [
            "first_name",
            "last_name",
            "phone"
        ];

        const body = Object.fromEntries(
            Object.entries(changes).filter(
                ([key]) => allowed.includes(key)
            )
        );

        if (!Object.keys(body).length) {
            return [];
        }

        const params = new URLSearchParams({
            id: `eq.${userId}`
        });

        return this.request(
            `${PROFILES_TABLE}?${params.toString()}`,
            {
                method: "PATCH",
                body: JSON.stringify(body)
            }
        );
    }

    async saveStaff(
        id,
        staffChanges = {},
        profileChanges = {}
    ) {
        const current = await this.getStaff(id);

        if (
            current.user_id &&
            Object.keys(profileChanges).length
        ) {
            await this.updateProfile(
                current.user_id,
                profileChanges
            );
        }

        if (Object.keys(staffChanges).length) {
            await this.updateStaff(
                id,
                staffChanges
            );
        }

        return this.getStaffForEdit(id);
    }

    async setStatus(id, active) {
    return this.updateStaff(id, {
        is_active: Boolean(active)
    });
}
        );
    }

    async deactivate(id) {
        return this.setStatus(id, false);
    }

    async activate(id) {
        return this.setStatus(id, true);
    }

    async savePermission(
        staffId,
        permissionKey,
        accessScope,
        enabled
    ) {
        if (!staffId || !permissionKey) {
            throw this.error(
                "PERMISSION_DATA_REQUIRED",
                "Staff ID and permission are required."
            );
        }

        const params = new URLSearchParams({
            staff_id: `eq.${staffId}`,
            permission_key: `eq.${permissionKey}`
        });

        const existing =
            await this.request(
                `${PERMISSIONS_TABLE}?${params.toString()}`
            );

        const body = {
            staff_id: staffId,
            permission_key: permissionKey,
            access_scope:
                enabled
                    ? accessScope
                    : "NONE",
            is_enabled: Boolean(enabled)
        };

        if (existing.length) {
            return this.request(
                `${PERMISSIONS_TABLE}?${params.toString()}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        access_scope:
                            body.access_scope,
                        is_enabled:
                            body.is_enabled
                    })
                }
            );
        }

        return this.request(
            PERMISSIONS_TABLE,
            {
                method: "POST",
                body: JSON.stringify(body)
            }
        );
    }

    async savePermissions(
        staffId,
        permissions
    ) {
        if (!Array.isArray(permissions)) {
            return [];
        }

        const results = [];

        for (const permission of permissions) {
            results.push(
                await this.savePermission(
                    staffId,
                    permission.permission_key,
                    permission.access_scope || "OWN",
                    permission.is_enabled === true
                )
            );
        }

        return results;
    }
}

export const staffAdminData =
    new StaffAdminDataService();

export {
    StaffAdminDataService
};

export default staffAdminData;
