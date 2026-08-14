CREATE VIEW IF NOT EXISTS vw_matter_activity_summary AS
SELECT
    m.id AS matter_id,
    m.reference_number,
    m.title,
    m.status,

    (
        SELECT COUNT(*)
        FROM documents d
        WHERE d.matter_id = m.id
    ) AS documents,

    (
        SELECT COUNT(*)
        FROM tasks t
        WHERE t.matter_id = m.id
          AND t.status NOT IN (
              'completed',
              'complete',
              'done'
          )
    ) AS outstanding_tasks,

    (
        SELECT COUNT(*)
        FROM workflows w
        WHERE w.matter_id = m.id
          AND w.status IN (
              'active',
              'in_progress',
              'running'
          )
    ) AS active_workflows,

    (
        SELECT COUNT(*)
        FROM timeline_entries te
        WHERE te.matter_id = m.id
    ) AS timeline_events,

    (
        SELECT COUNT(*)
        FROM communications cm
        WHERE cm.matter_id = m.id
    ) AS communications,

    (
        SELECT COUNT(*)
        FROM audit_logs al
        WHERE al.matter_id = m.id
    ) AS audit_events

FROM matters m;
