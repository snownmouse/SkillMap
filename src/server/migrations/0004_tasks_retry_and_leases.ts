import type { Migration } from './0001_initial';

export const migration_0004_tasks_retry_and_leases: Migration = {
  id: '0004_tasks_retry_and_leases',
  up: {
    sqlite: [
      `ALTER TABLE tasks ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE tasks ADD COLUMN max_attempts INTEGER`,
      `ALTER TABLE tasks ADD COLUMN next_retry_at TEXT`,
      `ALTER TABLE tasks ADD COLUMN lease_owner TEXT`,
      `ALTER TABLE tasks ADD COLUMN lease_expires_at TEXT`,
      `ALTER TABLE tasks ADD COLUMN last_started_at TEXT`,
      `ALTER TABLE tasks ADD COLUMN last_finished_at TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_retry_due ON tasks(status, next_retry_at)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_lease_expires ON tasks(lease_expires_at)`,
    ],
    postgres: [
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_attempts INTEGER`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS lease_owner TEXT`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_started_at TIMESTAMPTZ`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_finished_at TIMESTAMPTZ`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_retry_due ON tasks(status, next_retry_at)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_lease_expires ON tasks(lease_expires_at)`,
    ],
  },
  down: {
    sqlite: [],
    postgres: [
      `DROP INDEX IF EXISTS idx_tasks_retry_due`,
      `DROP INDEX IF EXISTS idx_tasks_lease_expires`,
      `ALTER TABLE tasks DROP COLUMN IF EXISTS attempts`,
      `ALTER TABLE tasks DROP COLUMN IF EXISTS max_attempts`,
      `ALTER TABLE tasks DROP COLUMN IF EXISTS next_retry_at`,
      `ALTER TABLE tasks DROP COLUMN IF EXISTS lease_owner`,
      `ALTER TABLE tasks DROP COLUMN IF EXISTS lease_expires_at`,
      `ALTER TABLE tasks DROP COLUMN IF EXISTS last_started_at`,
      `ALTER TABLE tasks DROP COLUMN IF EXISTS last_finished_at`,
    ],
  },
};

