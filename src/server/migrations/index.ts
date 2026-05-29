import type { Migration, MigrationDialect } from './0001_initial';
import { migration_0001_initial } from './0001_initial';
import { migration_0002_guest_sessions_and_tasks_user } from './0002_guest_sessions_and_tasks_user';
import { migration_0003_tasks_inputs } from './0003_tasks_inputs';
import { migration_0004_tasks_retry_and_leases } from './0004_tasks_retry_and_leases';
import { migration_0005_career_classification } from './0005_career_classification';

export type { Migration, MigrationDialect };

export const migrations: Migration[] = [
  migration_0001_initial,
  migration_0002_guest_sessions_and_tasks_user,
  migration_0003_tasks_inputs,
  migration_0004_tasks_retry_and_leases,
  migration_0005_career_classification
];

export function sortMigrations(list: Migration[]): Migration[] {
  return [...list].sort((a, b) => a.id.localeCompare(b.id));
}
