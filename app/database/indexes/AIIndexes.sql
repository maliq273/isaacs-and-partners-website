CREATE INDEX IF NOT EXISTS idx_ai_results_matter_id
ON ai_results(matter_id);

CREATE INDEX IF NOT EXISTS idx_ai_results_client_id
ON ai_results(client_id);

CREATE INDEX IF NOT EXISTS idx_ai_results_type
ON ai_results(type);

CREATE INDEX IF NOT EXISTS idx_ai_results_status
ON ai_results(status);

CREATE INDEX IF NOT EXISTS idx_ai_results_created_at
ON ai_results(created_at);
