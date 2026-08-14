CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id
ON audit_events(actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity_type
ON audit_events(entity_type);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity_id
ON audit_events(entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_action
ON audit_events(action);

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at
ON audit_events(created_at);
