import { initDatabase, getPool, closeDb } from '../../src/server/database';
import { migrateUp } from '../../src/server/migrate';

async function main() {
  await initDatabase();
  const pool = getPool();
  const dialect = process.env.DB_HOST ? 'postgres' : 'sqlite';
  const result = await migrateUp(pool, dialect);
  process.stdout.write(JSON.stringify(result, null, 2));
  process.stdout.write('\n');
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

