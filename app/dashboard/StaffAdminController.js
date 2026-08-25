import auth from "../auth/AuthService.js";
import navigation from "../core/navigation.js";
import { resolveUserDashboardRole } from "./DashboardAccess.js";
import staffAdminData from "./StaffAdminDataService.js";

class StaffAdminController {
    constructor() {
        this.staff = [];
        this.selectedStaff = null;
        this.initialised = false;

        this.handleLogout =
            this.handleLogout.bind(this);
    }

    async initialise() {
        if (this.initialised) return;

        await auth.initialise();

        if (!auth.isAuthenticated()) {
            return navigation.toLogin(
                window.location.pathname,
                { replace: true }
            );
        }

        const role =
            await resolveUserDashboardRole(
                auth.getCurrentUser()
            );

        if (role !== "SUPER_ADMIN") {
            return navigation.toRoleDashboard(
                role,
                { replace: true }
            );
        }

        this.bindEvents();

        await this.load();

        this.initialised = true;
    }

    async load() {
        this.setStatus(
            "Loading staff..."
        );

        try {
            this.staff =
                await staffAdminData.list();

            this.render();

            this.setStatus(
                `${this.staff.length} staff member(s) loaded.`
            );

        } catch (error) {
            console.error(
                "[StaffAdminController] Load failed",
                error
            );

            this.setStatus(
                error.message ||
                    "Staff data could not be loaded.",
                true
            );
        }
    }

    render() {
        const tbody =
            document.querySelector(
                "#staff-admin-table"
            );

        if (!tbody) return;

        if (!this.staff.length) {
            tbody.innerHTML =
                `<tr>
                    <td colspan="6">
                        No staff members have been created yet.
                    </td>
                </tr>`;

            return;
        }

        tbody.innerHTML =
            this.staff.map(member => {
                const profile =
                    member.profiles || {};

                const name =
                    [
                        profile.first_name,
                        profile.last_name
                    ]
                    .filter(Boolean)
                    .join(" ") ||
                    profile.email ||
                    member.user_id ||
                    member.id;

                const active =
                    member.is_active === true;

                return `
                    <tr>
                        <td>
                            <strong>
                                ${this.escape(name)}
                            </strong>
                            <small>
                                ${this.escape(
                                    profile.email || ""
                                )}
                            </small>
                        </td>

                        <td>
                            ${this.escape(
                                profile.role || "STAFF"
                            )}
                        </td>

                        <td>
                            ${this.escape(
                                member.department || "—"
                            )}
                        </td>

                        <td>
                            <span class="status-badge ${
                                active
                                    ? "active"
                                    : "inactive"
                            }">
                                ${
                                    active
                                        ? "Active"
                                        : "Inactive"
                                }
                            </span>
                        </td>

                        <td>
                            ${this.escape(
                                member.user_id || "—"
                            )}
                        </td>

                        <td class="table-actions">
                            <button
                                type="button"
                                class="btn btn-sm"
                                data-action="edit"
                                data-id="${this.escape(
                                    member.id
                                )}"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="btn btn-sm ${
                                    active
                                        ? "btn-danger"
                                        : "btn-primary"
                                }"
                                data-action="${
                                    active
                                        ? "deactivate"
                                        : "activate"
                                }"
                                data-id="${this.escape(
                                    member.id
                                )}"
                            >
                                ${
                                    active
                                        ? "Deactivate"
                                        : "Activate"
                                }
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");
    }

    bindEvents() {
        document
            .querySelector(
                "#staff-create-form"
            )
            ?.addEventListener(
                "submit",
                event => this.create(event)
            );

        document
            .querySelector(
                "#staff-admin-table"
            )
            ?.addEventListener(
                "click",
                event =>
                    this.handleTableAction(event)
            );

        document
            .querySelector(
                "#staff-refresh"
            )
            ?.addEventListener(
                "click",
                () => this.load()
            );

        document
            .querySelector(
                "#staff-editor-close"
            )
            ?.addEventListener(
                "click",
                () => this.closeEditor()
            );

        document
            .querySelector(
                "#staff-editor-form"
            )
            ?.addEventListener(
                "submit",
                event =>
                    this.saveStaff(event)
            );

        document
            .querySelector(
                "#permissions-save"
            )
            ?.addEventListener(
                "click",
                () => this.savePermissions()
            );

        document
            .querySelector(
                "#permissions-cancel"
            )
            ?.addEventListener(
                "click",
                () => this.closeEditor()
            );

        document
            .querySelectorAll(
                "[data-auth-action='logout']"
            )
            .forEach(button =>
                button.addEventListener(
                    "click",
                    this.handleLogout
                )
            );
    }

    async create(event) {
        event.preventDefault();

        const form =
            event.currentTarget;

        const submit =
            form.querySelector(
                "button[type='submit']"
            );

        const data =
            Object.fromEntries(
                new FormData(form).entries()
            );

        if (submit) {
            submit.disabled = true;
        }

        this.setStatus(
            "Creating staff account..."
        );

        try {
            await staffAdminData
                .createStaffAccount(data);

            form.reset();

            await this.load();

            this.setStatus(
                "Staff account created successfully."
            );

        } catch (error) {
            console.error(
                "[StaffAdminController] Create failed",
                error
            );

            this.setStatus(
                error.message ||
                    "Staff account could not be created.",
                true
            );

        } finally {
            if (submit) {
                submit.disabled = false;
            }
        }
    }

    async handleTableAction(event) {
        const button =
            event.target.closest(
                "button[data-action]"
            );

        if (!button) return;

        const id =
            button.dataset.id;

        const action =
            button.dataset.action;

        if (action === "edit") {
            return this.openEditor(id);
        }

        button.disabled = true;

        try {
            if (action === "deactivate") {
                await this.deactivate(id);
            }

            if (action === "activate") {
                await this.activate(id);
            }

            await this.load();

        } catch (error) {
            this.setStatus(
                error.message ||
                    "Staff status could not be updated.",
                true
            );

        } finally {
            button.disabled = false;
        }
    }

    async openEditor(id) {
        this.setStatus(
            "Loading staff permissions..."
        );

        try {
            this.selectedStaff =
                await staffAdminData
                    .getStaffForEdit(id);

            this.renderEditor();

        } catch (error) {
            console.error(
                "[StaffAdminController] Editor load failed",
                error
            );

            this.setStatus(
                error.message ||
                    "Staff member could not be loaded.",
                true
            );
        }
    }

    renderEditor() {
        const editor =
            document.querySelector(
                "#staff-editor"
            );

        if (!editor ||
            !this.selectedStaff) {
            return;
        }

        const {
            staff,
            profile,
            permissions,
            catalog
        } = this.selectedStaff;

        document.querySelector(
            "#edit-first-name"
        ).value =
            profile?.first_name || "";

        document.querySelector(
            "#edit-last-name"
        ).value =
            profile?.last_name || "";

        document.querySelector(
            "#edit-phone"
        ).value =
            profile?.phone || "";

        document.querySelector(
            "#edit-email"
        ).value =
            profile?.email || "";

        document.querySelector(
            "#edit-employee-number"
        ).value =
            staff.employee_number || "";

        document.querySelector(
            "#edit-department"
        ).value =
            staff.department || "";

        document.querySelector(
            "#edit-job-title"
        ).value =
            staff.job_title || "";

        this.renderPermissions(
            catalog,
            permissions
        );

        editor.hidden = false;

        editor.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    renderPermissions(
        catalog,
        existing
    ) {
        const container =
            document.querySelector(
                "#permissions-grid"
            );

        if (!container) return;

        const current =
            new Map(
                existing.map(item => [
                    item.permission_key,
                    item
                ])
            );

        const grouped = {};

        catalog.forEach(permission => {
            if (!grouped[permission.category]) {
                grouped[permission.category] = [];
            }

            grouped[
                permission.category
            ].push(permission);
        });

        container.innerHTML =
            Object.entries(grouped)
                .map(
                    ([category, permissions]) => `
                        <section class="permission-group">
                            <header>
                                <h3>
                                    ${this.escape(
                                        this.formatCategory(
                                            category
                                        )
                                    )}
                                </h3>
                            </header>

                            ${permissions.map(
                                permission => {
                                    const saved =
                                        current.get(
                                            permission.permission_key
                                        );

                                    const enabled =
                                        saved?.is_enabled ===
                                        true;

                                    const scope =
                                        saved?.access_scope &&
                                        saved.access_scope !==
                                            "NONE"
                                            ? saved.access_scope
                                            : "ASSIGNED";

                                    return `
                                        <div
                                            class="permission-row"
                                            data-permission-row="${this.escape(
                                                permission.permission_key
                                            )}"
                                        >
                                            <div>
                                                <strong>
                                                    ${this.escape(
                                                        permission.permission_name
                                                    )}
                                                </strong>

                                                <small>
                                                    ${this.escape(
                                                        permission.description ||
                                                            ""
                                                    )}
                                                </small>
                                            </div>

                                            <label>
                                                <input
                                                    type="checkbox"
                                                    data-permission-enabled
                                                    data-permission-key="${this.escape(
                                                        permission.permission_key
                                                    )}"
                                                    ${
                                                        enabled
                                                            ? "checked"
                                                            : ""
                                                    }
                                                >
                                                Enabled
                                            </label>

                                            <select
                                                class="form-control"
                                                data-permission-scope
                                                data-permission-key="${this.escape(
                                                    permission.permission_key
                                                )}"
                                                ${
                                                    enabled
                                                        ? ""
                                                        : "disabled"
                                                }
                                            >
                                                <option
                                                    value="OWN"
                                                    ${
                                                        scope ===
                                                        "OWN"
                                                            ? "selected"
                                                            : ""
                                                    }
                                                >
                                                    Own
                                                </option>

                                                <option
                                                    value="ASSIGNED"
                                                    ${
                                                        scope ===
                                                        "ASSIGNED"
                                                            ? "selected"
                                                            : ""
                                                    }
                                                >
                                                    Assigned
                                                </option>

                                                <option
                                                    value="DEPARTMENT"
                                                    ${
                                                        scope ===
                                                        "DEPARTMENT"
                                                            ? "selected"
                                                            : ""
                                                    }
                                                >
                                                    Department
                                                </option>

                                                <option
                                                    value="ALL"
                                                    ${
                                                        scope ===
                                                        "ALL"
                                                            ? "selected"
                                                            : ""
                                                    }
                                                >
                                                    All
                                                </option>
                                            </select>
                                        </div>
                                    `;
                                }
                            ).join("")}
                        </section>
                    `
                )
                .join("");

        container
            .querySelectorAll(
                "[data-permission-enabled]"
            )
            .forEach(checkbox => {
                checkbox.addEventListener(
                    "change",
                    event => {
                        const key =
                            event.currentTarget
                                .dataset
                                .permissionKey;

                        const select =
                            container.querySelector(
                                `[data-permission-scope][data-permission-key="${CSS.escape(
                                    key
                                )}"]`
                            );

                        if (select) {
                            select.disabled =
                                !event.currentTarget
                                    .checked;
                        }
                    }
                );
            });
    }

    async saveStaff(event) {
        event.preventDefault();

        if (!this.selectedStaff) {
            return;
        }

        const form =
            event.currentTarget;

        const submit =
            form.querySelector(
                "button[type='submit']"
            );

        if (submit) {
            submit.disabled = true;
        }

        this.setStatus(
            "Saving staff record..."
        );

        try {
            const staffChanges = {
                employee_number:
                    form.employee_number.value
                        .trim(),

                department:
                    form.department.value
                        .trim(),

                job_title:
                    form.job_title.value
                        .trim()
            };

            const profileChanges = {
                first_name:
                    form.first_name.value
                        .trim(),

                last_name:
                    form.last_name.value
                        .trim(),

                phone:
                    form.phone.value
                        .trim()
            };

            await staffAdminData.saveStaff(
                this.selectedStaff.staff.id,
                staffChanges,
                profileChanges
            );

            await this.load();

            this.setStatus(
                "Staff record updated successfully."
            );

        } catch (error) {
            console.error(
                "[StaffAdminController] Save failed",
                error
            );

            this.setStatus(
                error.message ||
                    "Staff record could not be updated.",
                true
            );

        } finally {
            if (submit) {
                submit.disabled = false;
            }
        }
    }

    async savePermissions() {
        if (!this.selectedStaff) {
            return;
        }

        const container =
            document.querySelector(
                "#permissions-grid"
            );

        if (!container) return;

        const permissions = [];

        container
            .querySelectorAll(
                "[data-permission-enabled]"
            )
            .forEach(checkbox => {
                const key =
                    checkbox.dataset
                        .permissionKey;

                const scope =
                    container.querySelector(
                        `[data-permission-scope][data-permission-key="${CSS.escape(
                            key
                        )}"]`
                    );

                permissions.push({
                    permission_key: key,
                    access_scope:
                        scope?.value ||
                        "ASSIGNED",
                    is_enabled:
                        checkbox.checked
                });
            });

        const button =
            document.querySelector(
                "#permissions-save"
            );

        if (button) {
            button.disabled = true;
        }

        this.setStatus(
            "Saving permissions..."
        );

        try {
            await staffAdminData
                .savePermissions(
                    this.selectedStaff.staff.id,
                    permissions
                );

            this.selectedStaff =
                await staffAdminData
                    .getStaffForEdit(
                        this.selectedStaff.staff.id
                    );

            this.renderPermissions(
                this.selectedStaff.catalog,
                this.selectedStaff.permissions
            );

            this.setStatus(
                "Permissions saved successfully."
            );

        } catch (error) {
            console.error(
                "[StaffAdminController] Permission save failed",
                error
            );

            this.setStatus(
                error.message ||
                    "Permissions could not be saved.",
                true
            );

        } finally {
            if (button) {
                button.disabled = false;
            }
        }
    }

    async deactivate(id) {
        const member =
            this.staff.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (!member) return;

        const confirmed =
            window.confirm(
                "Deactivate this staff member? They will no longer be treated as active staff."
            );

        if (!confirmed) return;

        await staffAdminData
            .deactivate(id);

        this.setStatus(
            "Staff member deactivated."
        );
    }

    async activate(id) {
        await staffAdminData
            .activate(id);

        this.setStatus(
            "Staff member activated."
        );
    }

    closeEditor() {
        const editor =
            document.querySelector(
                "#staff-editor"
            );

        if (editor) {
            editor.hidden = true;
        }

        this.selectedStaff = null;
    }

    formatCategory(category) {
        return String(category || "")
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, character =>
                character.toUpperCase()
            );
    }

    setStatus(
        message,
        error = false
    ) {
        const element =
            document.querySelector(
                "#staff-admin-status"
            );

        if (!element) return;

        element.textContent =
            message;

        element.classList.toggle(
            "login-error",
            error
        );
    }

    escape(value) {
        return String(
            value ?? ""
        ).replace(
            /[&<>'"]/g,
            character =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    "'": "&#39;",
                    '"': "&quot;"
                }[character])
        );
    }

    async handleLogout(event) {
        event.preventDefault();

        await auth.logout({
            remote: true,
            reason: "user"
        });

        navigation.toLogin(
            null,
            { replace: true }
        );
    }
}

export const staffAdminController =
    new StaffAdminController();

export default staffAdminController;
