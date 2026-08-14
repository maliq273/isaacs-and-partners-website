CREATE INDEX IF NOT EXISTS idx_appointments_client_id
ON appointments(client_id);

CREATE INDEX IF NOT EXISTS idx_appointments_matter_id
ON appointments(matter_id);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id
ON appointments(user_id);

CREATE INDEX IF NOT EXISTS idx_appointments_status
ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_appointments_start_time
ON appointments(start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_end_time
ON appointments(end_time);

CREATE INDEX IF NOT EXISTS idx_appointments_date
ON appointments(appointment_date);
