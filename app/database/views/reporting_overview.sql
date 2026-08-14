CREATE VIEW IF NOT EXISTS vw_reporting_overview AS
SELECT
    r.id,
    r.report_type,
    r.name,
    r.parameters,
    r.result_location,
    r.format,
    r.status,
    r.generated_at,
    r.created_at,
    r.updated_at,

    r.requested_by,

    TRIM(
        COALESCE(u.first_name, '') || ' ' ||
        COALESCE(u.last_name, '')
    ) AS requested_by_name

FROM reports r

LEFT JOIN users u
    ON u.id = r.requested_by;
