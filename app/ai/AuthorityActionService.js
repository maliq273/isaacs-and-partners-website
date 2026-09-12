const PERMISSIONS = Object.freeze({ MANAGE_AUTHORITY: "manage_authority", MANAGE_STAFF: "manage_staff", MANAGE_SYSTEM: "manage_system" });
const ACTION_WORDS = /\b(add|create|register|update|edit|change|modify|set|assign|deactivate|disable|activate|remove|revoke|grant|enable|allow|give|deny)\b/i;
const CAPABILITY_PHRASES = Object.freeze({
  can_liaise_with_ai: /liaise\s+with\s+anthony|liaise\s+with\s+ai/i,
  can_answer_ai_queries: /answer\s+anthony|answer\s+ai\s+(?:queries|questions)/i,
  can_relay_to_clients: /relay\s+(?:approved\s+)?(?:responses?|messages?)\s+to\s+clients?/i,
  can_handle_appointments: /handle\s+appointments?/i,
  can_provide_pricing: /provide\s+pricing|give\s+pricing/i,
  can_approve_quotes: /approve\s+quotes?/i,
  can_handle_immigration: /handle\s+immigration/i,
  can_handle_hr: /handle\s+(?:hr|ir|hr\s*\/\s*ir)/i,
  can_handle_business_compliance: /handle\s+business\s+compliance/i,
  can_handle_legal: /handle\s+legal/i,
  manage_authority: /manage\s+(?:authority|authority\s+&\s+people|authority\s+directory)/i,
  manage_staff: /manage\s+staff\s+permissions?/i,
  manage_system: /full\s+system\s+administration|manage\s+system|system\s+administration/i
});
function clean(v, max = 4096) { return String(v ?? "").trim().slice(0, max); }
function normalise(v) { return clean(v).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim(); }
function phone(v) { const raw = clean(v, 64); if (!raw || /@lid/i.test(raw)) return null; const digits = raw.replace(/\D/g, ""); return digits || null; }
function permissions(authority) { const directory = authority?.action_permissions && typeof authority.action_permissions === "object" ? authority.action_permissions : {}; const staff = authority?.permissions && typeof authority.permissions === "object" ? authority.permissions : {}; return { ...staff, ...directory }; }
function extractTarget(text) {
  const byPhone = text.match(/(?:number|whatsapp|phone)\s*(?:is|=|:)\s*([+\d][\d\s().-]{6,30})/i);
  const quoted = text.match(/(?:for|of|to)\s+["“']([^"”']{2,120})["”']/i);
  const role = text.match(/\b(?:as|role)\s+(SUPER_ADMIN|DIRECTOR|SHAREHOLDER|PARTNER|STAFF|STAKEHOLDER)\b/i);
  let fullName = quoted?.[1]?.trim() || null;
  if (!fullName) {
    const beforeRole = text.match(/\b(?:add|create|register|update|edit|change|modify|deactivate|disable|activate|remove|revoke|grant|enable|allow|give)\s+([A-Z][A-Za-zÀ-ÿ.'-]+(?:\s+[A-Z][A-Za-zÀ-ÿ.'-]+){1,4})\s+(?=as\b|with\b|who\b|whose\b|to\b)/);
    fullName = beforeRole?.[1]?.trim() || null;
  }
  if (!fullName) {
    const named = text.match(/(?:for|of|to)\s+([A-Z][A-Za-zÀ-ÿ.'-]+(?:\s+[A-Z][A-Za-zÀ-ÿ.'-]+){1,4})(?=\s+(?:as|with|and|who|whose|on|in|$))/);
    fullName = named?.[1]?.trim() || null;
  }
  return { phone: byPhone ? phone(byPhone[1]) : null, fullName, authorityRole: role?.[1]?.toUpperCase() || null };
}
function capabilityFromText(text) { for (const [key, pattern] of Object.entries(CAPABILITY_PHRASES)) if (pattern.test(text)) return key; return null; }

export default class AuthorityActionService {
  constructor({ db } = {}) { if (!db) throw new Error("AuthorityActionService requires a Supabase admin client."); this.db = db; }
  classify(message) {
    const text = normalise(message); if (!ACTION_WORDS.test(text)) return { action: null, permission: null, target: null };
    const capability = capabilityFromText(message);
    if (capability && /\b(grant|enable|allow|give|deny|remove|revoke|disable|set|change|update)\b/i.test(text)) return { action: "MANAGE_STAFF_PERMISSIONS", permission: PERMISSIONS.MANAGE_STAFF, target: extractTarget(message), capability, grant: /\b(grant|enable|allow|give)\b/i.test(text) };
    if (/\b(authority record|authority directory|authority)\b/i.test(text)) {
      const action = /\b(deactivate|disable|remove|revoke)\b/i.test(text) ? "DEACTIVATE_AUTHORITY" : /\b(add|create|register)\b/i.test(text) ? "CREATE_AUTHORITY" : "UPDATE_AUTHORITY";
      return { action, permission: PERMISSIONS.MANAGE_AUTHORITY, target: extractTarget(message) };
    }
    if (/\b(permission|permissions|access|capability|capabilities)\b/i.test(text) && /\b(staff|employee|person|administrator|admin|authority)\b/i.test(text)) return { action: "MANAGE_STAFF_PERMISSIONS", permission: PERMISSIONS.MANAGE_STAFF, target: extractTarget(message), capability: null, grant: /\b(grant|enable|allow|give)\b/i.test(text) };
    if (/\b(system|everything|anything|all security|security controls|rewrite anything|full authority)\b/i.test(text)) return { action: "MANAGE_SYSTEM", permission: PERMISSIONS.MANAGE_SYSTEM, target: null };
    return { action: null, permission: null, target: null };
  }
  canExecute(identity, permission) { if (!identity?.authenticated || !["STAFF", "SUPER_ADMIN"].includes(String(identity.authorityRole || "").toUpperCase())) return false; return permissions(identity.authority)[permission] === true; }
  async execute({ identity, message, conversationId = null } = {}) {
    const classification = this.classify(message); if (!classification.action) return { handled: false };
    const authorityId = identity?.authorityId || identity?.authority?.id || null; const actorId = identity?.authority?.user_id || null;
    if (!this.canExecute(identity, classification.permission)) { await this.audit({ authorityId, actorId, actorPhone: identity?.sourcePhone, action: classification.action, targetType: "AUTHORITY", requestText: message, decision: "DENIED", reason: `Required permission is not granted: ${classification.permission}.`, metadata: { conversation_id: conversationId } }); return { handled: true, executed: false, action: classification.action, permission: classification.permission, reply: `I recognise you as ${identity.authorityRole.replace(/_/g, " ")}, but I cannot execute that action because ${classification.permission} is not enabled for your authority record.` }; }
    if (classification.action === "MANAGE_SYSTEM") { await this.audit({ authorityId, actorId, actorPhone: identity?.sourcePhone, action: classification.action, targetType: "SYSTEM", requestText: message, decision: "DENIED", reason: "A broad request is not treated as permission to bypass security. It must resolve to a specific executable operation.", metadata: { conversation_id: conversationId } }); return { handled: true, executed: false, action: classification.action, permission: classification.permission, reply: "I can execute specific authorised system changes, but I will not interpret 'do anything' or 'rewrite everything' as permission to bypass security. Give me the exact change and I will check the required permission." }; }
    if (classification.action === "MANAGE_STAFF_PERMISSIONS") return this.executePermissionMutation({ identity, classification, message, conversationId });
    return this.executeAuthorityMutation({ identity, classification, message, conversationId });
  }
  async executePermissionMutation({ identity, classification, message, conversationId }) {
    const target = classification.target || {}; const authorityId = identity?.authorityId || null; const actorId = identity?.authority?.user_id || null;
    if (!target.fullName && !target.phone) return { handled: true, executed: false, action: classification.action, permission: classification.permission, reply: "I can manage that permission, but I need the person's full name or WhatsApp number." };
    if (!classification.capability) return { handled: true, executed: false, action: classification.action, permission: classification.permission, reply: "I can manage the person's permissions, but I need the exact capability you want enabled or removed." };
    const row = await this.findAuthority(target); if (!row) return { handled: true, executed: false, action: classification.action, permission: classification.permission, reply: "I could not find an authority record matching that person or number." };
    const before = row.action_permissions || {}; const after = { ...before, [classification.capability]: classification.grant === true };
    const saved = await this.db.from("authority_directory").update({ action_permissions: after, updated_by: actorId }).eq("id", row.id).select("*").single(); if (saved.error) throw saved.error;
    if (row.user_id && classification.capability.startsWith("can_")) { const staff = await this.db.from("staff_ai_permissions").select("id").eq("staff_user_id", row.user_id).maybeSingle(); if (staff.error) throw staff.error; const fieldBody = { [classification.capability]: classification.grant === true, updated_by: actorId, is_active: true }; const r = staff.data?.id ? await this.db.from("staff_ai_permissions").update(fieldBody).eq("id", staff.data.id) : await this.db.from("staff_ai_permissions").insert({ staff_user_id: row.user_id, ...fieldBody }); if (r.error) throw r.error; }
    await this.audit({ authorityId, actorId, actorPhone: identity?.sourcePhone, action: classification.action, targetType: "AUTHORITY", targetId: row.id, requestText: message, decision: "EXECUTED", reason: "Authorised permission mutation.", beforeData: before, afterData: saved.data.action_permissions, metadata: { conversation_id: conversationId, capability: classification.capability, grant: classification.grant === true } });
    return { handled: true, executed: true, action: classification.action, permission: classification.permission, reply: `Done. ${classification.grant ? "Enabled" : "Removed"} ${classification.capability} for ${saved.data.full_name}. The permission change is recorded in the authority audit trail.` };
  }
  async executeAuthorityMutation({ identity, classification, message, conversationId }) {
    const target = classification.target || {}; const authorityId = identity?.authorityId || null; const actorId = identity?.authority?.user_id || null;
    if (classification.action === "DEACTIVATE_AUTHORITY") { const row = await this.findAuthority(target); if (!row) return { handled: true, executed: false, action: classification.action, permission: classification.permission, reply: "I have the required permission, but I could not identify the authority record. Give me the person's full name or WhatsApp number." }; const updated = await this.db.from("authority_directory").update({ is_active: false, updated_by: actorId }).eq("id", row.id).select("*").single(); if (updated.error) throw updated.error; await this.audit({ authorityId, actorId, actorPhone: identity?.sourcePhone, action: classification.action, targetType: "AUTHORITY", targetId: row.id, requestText: message, decision: "EXECUTED", reason: "Authorised authority-directory mutation.", beforeData: row, afterData: updated.data, metadata: { conversation_id: conversationId } }); return { handled: true, executed: true, action: classification.action, permission: classification.permission, reply: `Done. I deactivated the authority record for ${updated.data.full_name}. The change is recorded in the authority audit trail.` }; }
    if (!target.fullName || !target.phone || !target.authorityRole) return { handled: true, executed: false, action: classification.action, permission: classification.permission, reply: "I can make that authority-directory change, but I need the person's full name, WhatsApp number, and authority role before I mutate the record." };
    const existing = await this.findAuthority(target); if (classification.action === "UPDATE_AUTHORITY" && !existing) return { handled: true, executed: false, action: classification.action, permission: classification.permission, reply: "I could not find an existing authority record matching that person or number, so I will not create a new record under an update instruction." };
    const data = { full_name: target.fullName, phone_number: target.phone, authority_role: target.authorityRole, is_active: true, updated_by: actorId }; const saved = existing ? await this.db.from("authority_directory").update(data).eq("id", existing.id).select("*").single() : await this.db.from("authority_directory").insert({ ...data, created_by: actorId }).select("*").single(); if (saved.error) throw saved.error;
    await this.audit({ authorityId, actorId, actorPhone: identity?.sourcePhone, action: classification.action, targetType: "AUTHORITY", targetId: saved.data.id, requestText: message, decision: "EXECUTED", reason: "Authorised authority-directory mutation.", beforeData: existing, afterData: saved.data, metadata: { conversation_id: conversationId } });
    return { handled: true, executed: true, action: classification.action, permission: classification.permission, reply: `Done. I ${existing ? "updated" : "created"} the authority record for ${saved.data.full_name} as ${saved.data.authority_role.replace(/_/g, " ")}. The change is recorded in the authority audit trail.` };
  }
  async findAuthority(target) { if (target?.phone) { const q = await this.db.from("authority_directory").select("*").eq("phone_number", target.phone).maybeSingle(); if (q.error) throw q.error; if (q.data) return q.data; } if (target?.fullName) { const q = await this.db.from("authority_directory").select("*").ilike("full_name", target.fullName).maybeSingle(); if (q.error) throw q.error; if (q.data) return q.data; } return null; }
  async audit({ authorityId = null, actorId = null, actorPhone = null, action, targetType = null, targetId = null, requestText = null, decision, reason = null, beforeData = null, afterData = null, metadata = {} }) { const q = await this.db.from("authority_action_audit").insert({ authority_id: authorityId, actor_user_id: actorId, actor_phone: actorPhone || null, action, target_type: targetType, target_id: targetId, request_text: clean(requestText, 4096), decision, reason, before_data: beforeData, after_data: afterData, metadata }); if (q.error) throw q.error; }
}
export { PERMISSIONS };
