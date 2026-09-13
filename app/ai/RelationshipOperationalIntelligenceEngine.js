import AIOperationalReadModel from "./AIOperationalReadModel.js";

/**
 * Isaacs & Partners — Relationship & Operational Intelligence Engine
 *
 * Read-only intelligence layer. It combines customer relationship state with
 * authorised operational records fetched via AIOperationalReadModel.
 * It never grants authority or permissions.
 */
export default class RelationshipOperationalIntelligenceEngine {
    constructor({ db, authority = null } = {}) {
        this.db = db;
        this.authority = authority;
        this.readModel = db ? new AIOperationalReadModel({ db }) : null;
    }

    async build({ contactId = null, userId = null, matterId = null, now = new Date().toISOString() } = {}) {
        if (!this.db) throw new Error("Database client is required.");
        const snapshot = await this.readModel.buildSnapshot({ contactId, userId, matterId, now });
        const identity = snapshot.identity;
        if (!identity.contactId && !identity.userId) return this.empty("NO_IDENTITY");

        const [relationship, staff] = await Promise.all([
            this.relationship(identity),
            this.staffOwnership(matterId)
        ]);

        return {
            identity,
            relationship,
            matters: snapshot.matters || [],
            userMatters: snapshot.matters || [],
            appointments: snapshot.appointments || [],
            allAppointments: snapshot.allAppointments || [],
            documents: snapshot.documents || [],
            allDocuments: snapshot.allDocuments || [],
            invoices: snapshot.invoices || [],
            allInvoices: snapshot.allInvoices || [],
            commitments: snapshot.commitments || [],
            staffOwnership: staff || [],
            portfolio: {
                status: relationship?.relationship_status || "ACTIVE",
                ...snapshot.portfolio
            }
        };
    }

    async resolveIdentity({ contactId, userId }) {
        if (this.readModel) return this.readModel.resolveIdentity({ contactId, userId });
        if (contactId) {
            const { data, error } = await this.db.from("communication_contacts").select("id,user_id,first_name,last_name,email,phone_number,identity_status,contact_type").eq("id", contactId).maybeSingle();
            if (error) throw error;
            return { contactId: data?.id || contactId, userId: userId || data?.user_id || null, contact: data || null, businessIds: [] };
        }
        return { contactId: null, userId: userId || null, contact: null, businessIds: [] };
    }

    async relationship({ contactId, userId }) {
        let q = this.db.from("ai_customer_relationship_state").select("*").order("updated_at", { ascending: false }).limit(1);
        q = contactId ? q.eq("contact_id", contactId) : q.eq("client_user_id", userId);
        const { data, error } = await q.maybeSingle();
        if (error) throw error;
        return data || null;
    }

    async matters(identity, matterId) {
        if (this.readModel) return this.readModel.fetchMatters(identity, matterId);
        return [];
    }

    async appointments(identity, matterId) {
        if (this.readModel) return this.readModel.fetchAppointments(identity);
        return [];
    }

    async documents(identity, matterId) {
        if (this.readModel) return this.readModel.fetchDocuments(identity);
        return [];
    }

    async commitments(identity, matterId) {
        if (this.readModel) return this.readModel.fetchCommitments(identity, matterId);
        return [];
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
        return { identity: { contactId: null, userId: null, businessIds: [] }, relationship: null, matters: [], userMatters: [], appointments: [], allAppointments: [], documents: [], allDocuments: [], invoices: [], allInvoices: [], commitments: [], staffOwnership: [], portfolio: { status: "UNKNOWN", attentionLevel: "NORMAL", nextAction: null, nextActionDueAt: null, reason } };
    }
}

