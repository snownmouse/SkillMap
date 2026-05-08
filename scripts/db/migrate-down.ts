import { initDatabase, getPool, closeDb } from '../../src/server/database';
import { migrateDown } from '../../src/server/migrate';

async function main() {
  const steps = Math.max(1, parseInt(process.env.MIGRATE_DOWN_STEPS || '1'));
  await initDatabase();
  const pool = getPool();
  const dialect = process.env.DB_HOST ? 'postgres' : 'sqlite';
  const result = await migrateDown(pool, dialect, steps);
  process.stdout.write(JSON.stringify(result, null, 2));
  process.stdout.write('\n');
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

