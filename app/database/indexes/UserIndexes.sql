CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_username
ON users(username);

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_status
ON users(status);

CREATE INDEX IF NOT EXISTS idx_users_last_login
ON users(last_login);
