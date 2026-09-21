/**
 * Isaacs & Partners — Authenticated AI Operational Read Model
 *
 * Provides authenticated, real-time matter state retrieval and operational data fetching
 * directly from Supabase for Anthony (the AI client liaison).
 *
 * Ensures that AI interactions rely on live, authoritative operational data
 * rather than prompt-injected static company truth alone.
 */

export default class AIOperationalReadModel {
    /**
     * @param {Object} options
     * @param {Object} options.db Supabase database client instance
     */
    constructor({ db } = {}) {
        if (!db) {
            throw new Error("AIOperationalReadModel requires a Supabase database client instance.");
        }
        this.db = db;
    }

    /**
     * Resolves the identity context for fetching operational records,
     * including user ID, contact ID, and any owned business IDs.
     */
    async resolveIdentity({ contactId = null, userId = null } = {}) {
        let contact = null;
        let effectiveUserId = userId || null;

        if (contactId) {
            try {
                const { data, error } = await this.db
                    .from("communication_contacts")
                    .select("id, user_id, first_name, last_name, email, phone_number, identity_status, contact_type, onboarding_facts")
                    .eq("id", contactId)
                    .maybeSingle();

                if (!error && data) {
                    contact = data;
                    if (!effectiveUserId && data.user_id) {
                        effectiveUserId = data.user_id;
                    }
                }
            } catch (err) {
                console.warn("[AIOperationalReadModel] Contact resolution failed:", err.message);
            }
        }

        let businessIds = [];
        if (effectiveUserId) {
            try {
                const { data: bData, error: bErr } = await this.db
                    .from("businesses")
                    .select("id")
                    .eq("owner_user_id", effectiveUserId);

                if (!bErr && Array.isArray(bData)) {
                    businessIds = bData.map(b => b.id).filter(Boolean);
                }
            } catch (err) {
                console.warn("[AIOperationalReadModel] Business resolution failed:", err.message);
            }
        }

        return {
            contactId: contact?.id || contactId || null,
            userId: effectiveUserId,
            contact,
            businessIds
        };
    }

    /**
     * Fetches live matters from Supabase for individual users, business owners, or specific matter IDs.
     */
    async fetchMatters(identity, matterId = null) {
        const { userId, businessIds } = identity;

        try {
            let q = this.db
                .from("matters")
                .select("id, matter_number, reference, status, service_type, service_domain, department, title, description, priority, workflow_status, individual_user_id, business_id, created_at, updated_at, due_date")
                .order("updated_at", { ascending: false })
                .limit(50);

            if (matterId) {
                q = q.eq("id", matterId);
            } else if (userId && businessIds.length > 0) {
                q = q.or(`individual_user_id.eq.${userId},business_id.in.(${businessIds.join(",")})`);
            } else if (userId) {
                q = q.eq("individual_user_id", userId);
            } else if (businessIds.length > 0) {
                q = q.in("business_id", businessIds);
            } else {
                return [];
            }

            const { data, error } = await q;
            if (error) {
                console.error("[AIOperationalReadModel] Error fetching matters:", error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error("[AIOperationalReadModel] Exception fetching matters:", err.message);
            return [];
        }
    }

    /**
     * Fetches live documents associated with user or specific matter IDs.
     */
    async fetchDocuments(identity, matterIds = []) {
        const { userId, businessIds } = identity;
        if (!userId && matterIds.length === 0) return [];

        try {
            let q = this.db
                .from("documents")
                .select("id, matter_id, document_type, name, status, required, reviewed, uploaded_at, reviewed_at, notes, created_at, updated_at, individual_user_id, business_id")
                .order("updated_at", { ascending: false })
                .limit(100);

            if (matterIds.length > 0) {
                q = q.in("matter_id", matterIds);
            } else if (userId && businessIds.length > 0) {
                q = q.or(`individual_user_id.eq.${userId},business_id.in.(${businessIds.join(",")})`);
            } else if (userId) {
                q = q.eq("individual_user_id", userId);
            }

            const { data, error } = await q;
            if (error) {
                console.error("[AIOperationalReadModel] Error fetching documents:", error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error("[AIOperationalReadModel] Exception fetching documents:", err.message);
            return [];
        }
    }

    /**
     * Fetches live upcoming/scheduled appointments.
     */
    async fetchAppointments(identity, matterIds = []) {
        const { userId, businessIds } = identity;
        if (!userId && matterIds.length === 0) return [];

        try {
            let q = this.db
                .from("appointments")
                .select("id, matter_id, title, appointment_type, starts_at, ends_at, status, location, notes, individual_user_id, business_id")
                .order("starts_at", { ascending: true })
                .limit(50);

            if (matterIds.length > 0) {
                q = q.in("matter_id", matterIds);
            } else if (userId && businessIds.length > 0) {
                q = q.or(`individual_user_id.eq.${userId},business_id.in.(${businessIds.join(",")})`);
            } else if (userId) {
                q = q.eq("individual_user_id", userId);
            }

            const { data, error } = await q;
            if (error) {
                console.error("[AIOperationalReadModel] Error fetching appointments:", error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error("[AIOperationalReadModel] Exception fetching appointments:", err.message);
            return [];
        }
    }

    /**
     * Fetches live invoices and balances from Supabase.
     */
    async fetchInvoices(identity, matterIds = []) {
        const { userId, businessIds } = identity;
        if (!userId && matterIds.length === 0) return [];

        try {
            let q = this.db
                .from("invoices")
                .select("id, matter_id, invoice_number, status, total_amount:total, paid_amount:amount_paid, due_date, created_at, individual_user_id, business_id")
                .order("created_at", { ascending: false })
                .limit(50);

            if (matterIds.length > 0) {
                q = q.in("matter_id", matterIds);
            } else if (userId && businessIds.length > 0) {
                q = q.or(`individual_user_id.eq.${userId},business_id.in.(${businessIds.join(",")})`);
            } else if (userId) {
                q = q.eq("individual_user_id", userId);
            }

            const { data, error } = await q;
            if (error) {
                if (!["42P01", "PGRST205"].includes(error.code)) {
                    console.error("[AIOperationalReadModel] Error fetching invoices:", error);
                }
                return [];
            }

            return data || [];
        } catch (err) {
            return [];
        }
    }

    /**
     * Fetches open commitments for identity or matter.
     */
    async fetchCommitments(identity, matterId = null) {
        const { contactId, userId } = identity;
        if (!contactId && !userId && !matterId) return [];

        try {
            let q = this.db
                .from("ai_relationship_commitments")
                .select("*")
                .order("due_at", { ascending: true, nullsFirst: false })
                .limit(50);

            if (matterId) {
                q = q.eq("matter_id", matterId);
            } else if (contactId) {
                q = q.eq("contact_id", contactId);
            } else if (userId) {
                q = q.eq("client_user_id", userId);
            }

            const { data, error } = await q;
            if (error) {
                if (!["42P01", "PGRST205"].includes(error.code)) {
                    console.error("[AIOperationalReadModel] Error fetching commitments:", error);
                }
                return [];
            }

            return data || [];
        } catch (err) {
            return [];
        }
    }

    /**
     * Builds the unified operational read model snapshot for Anthony.
     */
    async buildSnapshot({ contactId = null, userId = null, matterId = null, now = new Date().toISOString() } = {}) {
        const identity = await this.resolveIdentity({ contactId, userId });
        const matters = await this.fetchMatters(identity, matterId);
        const matterIds = matters.map(m => m.id).filter(Boolean);

        const [documents, appointments, invoices, commitments] = await Promise.all([
            this.fetchDocuments(identity, matterIds),
            this.fetchAppointments(identity, matterIds),
            this.fetchInvoices(identity, matterIds),
            this.fetchCommitments(identity, matterId)
        ]);

        const outstandingDocs = documents.filter(d => d.status !== "COMPLETED" && d.status !== "APPROVED");
        const upcomingAppts = appointments.filter(a => a.starts_at && new Date(a.starts_at) >= new Date(now) && !["CANCELLED", "COMPLETED"].includes(String(a.status || "").toUpperCase()));
        const openInvoices = invoices.filter(i => !["PAID", "CANCELLED"].includes(String(i.status || "").toUpperCase()));
        const openCommitments = commitments.filter(c => !["COMPLETED", "CANCELLED", "CLOSED"].includes(String(c.status || "").toUpperCase()));
        const overdueCommitments = openCommitments.filter(c => c.due_at && new Date(c.due_at) < new Date(now));

        const nextAppointment = upcomingAppts.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0] || null;
        const nextCommitment = openCommitments.filter(c => c.due_at).sort((a, b) => new Date(a.due_at) - new Date(b.due_at))[0] || null;

        const attention = overdueCommitments.length ? "URGENT" : outstandingDocs.length || openCommitments.length ? "ATTENTION" : "NORMAL";
        const nextAction = overdueCommitments[0]?.description || outstandingDocs[0]?.name || nextCommitment?.description || (nextAppointment ? `Appointment: ${nextAppointment.title || "scheduled appointment"}` : null);
        const nextActionDueAt = overdueCommitments[0]?.due_at || nextCommitment?.due_at || nextAppointment?.starts_at || null;

        return {
            identity,
            matters,
            userMatters: matters,
            documents: outstandingDocs,
            allDocuments: documents,
            appointments: upcomingAppts,
            allAppointments: appointments,
            invoices: openInvoices,
            allInvoices: invoices,
            commitments: openCommitments,
            portfolio: {
                attentionLevel: attention,
                totalMatters: matters.length,
                openCommitments: openCommitments.length,
                overdueCommitments: overdueCommitments.length,
                outstandingDocuments: outstandingDocs.length,
                upcomingAppointments: upcomingAppts.length,
                unpaidInvoices: openInvoices.length,
                nextAction,
                nextActionDueAt
            }
        };
    }
}
