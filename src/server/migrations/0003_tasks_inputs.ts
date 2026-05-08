import type { Migration } from './0001_initial';

export const migration_0003_tasks_inputs: Migration = {
  id: '0003_tasks_inputs',
  up: {
    sqlite: [
      `ALTER TABLE tasks ADD COLUMN inputs TEXT`,
    ],
    postgres: [
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS inputs TEXT`,
    ],
  },
  down: {
    sqlite: [],
    postgres: [
      `ALTER TABLE tasks DROP COLUMN IF EXISTS inputs`,
    ],
  },
};

