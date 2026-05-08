import type { Migration } from './0001_initial';

export const migration_0002_guest_sessions_and_tasks_user: Migration = {
  id: '0002_guest_sessions_and_tasks_user',
  up: {
    sqlite: [
      `ALTER TABLE tasks ADD COLUMN user_id TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`,

      `CREATE TABLE IF NOT EXISTS guest_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_guest_sessions_user_id ON guest_sessions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON guest_sessions(expires_at)`,
    ],
    postgres: [
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`,

      `CREATE TABLE IF NOT EXISTS guest_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_guest_sessions_user_id ON guest_sessions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON guest_sessions(expires_at)`,
    ],
  },
  down: {
    sqlite: [
      `DROP TABLE IF EXISTS guest_sessions`,
      `DROP INDEX IF EXISTS idx_guest_sessions_user_id`,
      `DROP INDEX IF EXISTS idx_guest_sessions_expires_at`,
    ],
    postgres: [
      `DROP TABLE IF EXISTS guest_sessions`,
      `ALTER TABLE tasks DROP COLUMN IF EXISTS user_id`,
    ],
  },
};

