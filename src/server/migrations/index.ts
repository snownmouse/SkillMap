import type { Migration, MigrationDialect } from './0001_initial';
import { migration_0001_initial } from './0001_initial';

export type { Migration, MigrationDialect };

export const migrations: Migration[] = [
  migration_0001_initial
];

export function sortMigrations(list: Migration[]): Migration[] {
  return [...list].sort((a, b) => a.id.localeCompare(b.id));
}

