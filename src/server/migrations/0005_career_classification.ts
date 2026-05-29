import type { Migration } from './0001_initial';

export const migration_0005_career_classification: Migration = {
  id: '0005_career_classification',
  up: {
    sqlite: [
      `CREATE TABLE IF NOT EXISTS career_classification (
        id TEXT PRIMARY KEY,
        sn TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        gbmcode TEXT,
        level INTEGER NOT NULL DEFAULT 4,
        parent_sn TEXT,
        source TEXT DEFAULT 'national_occupation_classification',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_cc_sn ON career_classification(sn)`,
      `CREATE INDEX IF NOT EXISTS idx_cc_parent ON career_classification(parent_sn)`,
      `CREATE INDEX IF NOT EXISTS idx_cc_name ON career_classification(name)`,

      `CREATE TABLE IF NOT EXISTS talent_demand (
        id TEXT PRIMARY KEY,
        region TEXT NOT NULL,
        industry TEXT NOT NULL,
        occupation TEXT NOT NULL,
        shortage_level TEXT NOT NULL,
        source TEXT NOT NULL,
        publish_year INTEGER NOT NULL,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_td_occupation ON talent_demand(occupation)`,
      `CREATE INDEX IF NOT EXISTS idx_td_industry ON talent_demand(industry)`,
    ],
    postgres: [
      `CREATE TABLE IF NOT EXISTS career_classification (
        id TEXT PRIMARY KEY,
        sn TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        gbmcode TEXT,
        level INTEGER NOT NULL DEFAULT 4,
        parent_sn TEXT,
        source TEXT DEFAULT 'national_occupation_classification',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_cc_sn ON career_classification(sn)`,
      `CREATE INDEX IF NOT EXISTS idx_cc_parent ON career_classification(parent_sn)`,
      `CREATE INDEX IF NOT EXISTS idx_cc_name ON career_classification(name)`,

      `CREATE TABLE IF NOT EXISTS talent_demand (
        id TEXT PRIMARY KEY,
        region TEXT NOT NULL,
        industry TEXT NOT NULL,
        occupation TEXT NOT NULL,
        shortage_level TEXT NOT NULL,
        source TEXT NOT NULL,
        publish_year INTEGER NOT NULL,
        details TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_td_occupation ON talent_demand(occupation)`,
      `CREATE INDEX IF NOT EXISTS idx_td_industry ON talent_demand(industry)`,
    ],
  },
  down: {
    sqlite: [
      `DROP INDEX IF EXISTS idx_cc_sn`,
      `DROP INDEX IF EXISTS idx_cc_parent`,
      `DROP INDEX IF EXISTS idx_cc_name`,
      `DROP TABLE IF EXISTS career_classification`,
      `DROP INDEX IF EXISTS idx_td_occupation`,
      `DROP INDEX IF EXISTS idx_td_industry`,
      `DROP TABLE IF EXISTS talent_demand`,
    ],
    postgres: [
      `DROP INDEX IF EXISTS idx_cc_sn`,
      `DROP INDEX IF EXISTS idx_cc_parent`,
      `DROP INDEX IF EXISTS idx_cc_name`,
      `DROP TABLE IF EXISTS career_classification`,
      `DROP INDEX IF EXISTS idx_td_occupation`,
      `DROP INDEX IF EXISTS idx_td_industry`,
      `DROP TABLE IF EXISTS talent_demand`,
    ],
  },
};