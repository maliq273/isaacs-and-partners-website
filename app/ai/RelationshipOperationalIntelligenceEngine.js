/**
 * Isaacs & Partners — Relationship & Operational Intelligence Engine
 *
 * Read-only intelligence layer. It combines customer relationship state with
 * authorised operational records. It never grants authority or permissions.
 */
export default class RelationshipOperationalIntelligenceEngine {
    constructor({ db, authority = null } = {}) {
        this.db = db;
        this.authority = authority;
    }

    async build({ contactId = null, userId = null, matterId = null, now = new Date().toISOString() } = {}) {
        if (!this.db) throw new Error("Database client is required.");
        const identity = await this.resolveIdentity({ contactId, userId });
        if (!identity.contactId && !identity.userId) return this.empty("NO_IDENTITY");

        const [relationship, matters, appointments, documents, commitments, staff] = await Promise.all([
            this.relationship(identity),
            this.matters(identity, matterId),
            this.appointments(identity, matterId),
            this.documents(identity, matterId),
            this.commitments(identity, matterId, now),
            this.staffOwnership(matterId)
        ]);

        const outstandingDocuments = (documents || []).filter(d => d.status !== "COMPLETED" && d.status !== "APPROVED");
        const upcomingAppointments = (appointments || []).filter(a => a.starts_at && new Date(a.starts_at) >= new Date(now) && !["CANCELLED", "COMPLETED"].includes(String(a.status || "").toUpperCase()));
        const openCommitments = (commitments || []).filter(c => !["COMPLETED", "CANCELLED", "CLOSED"].includes(String(c.status || "").toUpperCase()));
        const overdueCommitments = openCommitments.filter(c => c.due_at && new Date(c.due_at) < new Date(now));
        const nextAppointment = upcomingAppointments.sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at))[0] || null;
        const nextCommitment = openCommitments.filter(c => c.due_at).sort((a,b) => new Date(a.due_at) - new Date(b.due_at))[0] || null;
        const attention = overdueCommitments.length ? "URGENT" : outstandingDocuments.length || openCommitments.length ? "ATTENTION" : "NORMAL";
        const nextAction = overdueCommitments[0]?.description || outstandingDocuments[0]?.name || nextCommitment?.description || (nextAppointment ? `Appointment: ${nextAppointment.title || "scheduled appointment"}` : null);
        const nextActionDueAt = overdueCommitments[0]?.due_at || nextCommitment?.due_at || nextAppointment?.starts_at || null;

        return {
            identity,
            relationship,
            matters: matters || [],
            appointments: upcomingAppointments,
            documents: outstandingDocuments,
            commitments: openCommitments,
            staffOwnership: staff || [],
            portfolio: {
                status: relationship?.relationship_status || "ACTIVE",
                attentionLevel: attention,
                openCommitments: openCommitments.length,
                overdueCommitments: overdueCommitments.length,
                outstandingDocuments: outstandingDocuments.length,
                upcomingAppointments: upcomingAppointments.length,
                nextAction,
                nextActionDueAt
            }
        };
    }

    async resolveIdentity({ contactId, userId }) {
        if (contactId) {
            const { data, error } = await this.db.from("communication_contacts").select("id,user_id,first_name,last_name,email,phone_number,identity_status,contact_type").eq("id", contactId).maybeSingle();
            if (error) throw error;
            return { contactId: data?.id || contactId, userId: userId || data?.user_id || null, contact: data || null };
        }
        return { contactId: null, userId: userId || null, contact: null };
    }

    async relationship({ contactId, userId }) {
        let q = this.db.from("ai_customer_relationship_state").select("*").order("updated_at", { ascending: false }).limit(1);
        q = contactId ? q.eq("contact_id", contactId) : q.eq("client_user_id", userId);
        const { data, error } = await q.maybeSingle();
        if (error) throw error;
        return data || null;
    }

    async matters({ userId }, matterId) {
        if (!userId) return [];
        let q = this.db.from("matters").select("id,matter_number,reference,status,service_type,service_domain,department,title,description,priority,workflow_status,created_at,updated_at,due_date").order("updated_at", { ascending: false }).limit(50);
        if (matterId) q = q.eq("id", matterId);
        else q = q.eq("individual_user_id", userId);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    }

    async appointments({ userId }, matterId) {
        if (!userId) return [];
        let q = this.db.from("appointments").select("id,matter_id,title,appointment_type,starts_at,ends_at,status,location,notes").order("starts_at", { ascending: true }).limit(50);
        if (matterId) q = q.eq("matter_id", matterId);
        else q = q.eq("individual_user_id", userId);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    }

    async documents({ userId }, matterId) {
        if (!userId) return [];
        let q = this.db.from("documents").select("id,matter_id,document_type,name,status,required,reviewed,uploaded_at,reviewed_at,notes,created_at,updated_at").order("updated_at", { ascending: false }).limit(100);
        if (matterId) q = q.eq("matter_id", matterId);
        else q = q.eq("individual_user_id", userId);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    }

    async commitments({ contactId, userId }, matterId, now) {
        let q = this.db.from("ai_relationship_commitments").select("*").order("due_at", { ascending: true, nullsFirst: false }).limit(100);
        if (matterId) q = q.eq("matter_id", matterId);
        else if (contactId) q = q.eq("contact_id", contactId);
        else q = q.eq("client_user_id", userId);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    }

    async staffOwnership(matterId) {
        if (!matterId) return [];
        const { data, error } = await this.db.from("matter_staff").select("*").eq("matter_id", matterId);
        if (error) {
            if (["42P01", "PGRST205"].includes(error.code)) return [];
            throw error;
        }
        return data || [];
    }

    empty(reason) {
        return { identity: { contactId: null, userId: null }, relationship: null, matters: [], appointments: [], documents: [], commitments: [], staffOwnership: [], portfolio: { status: "UNKNOWN", attentionLevel: "NORMAL", nextAction: null, nextActionDueAt: null, reason } };
    }
}
