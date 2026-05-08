import { initDatabase, getPool, closeDb } from '../../src/server/database';

async function main() {
  await initDatabase();
  const pool = getPool();
  const res = await pool.query('SELECT id, applied_at FROM schema_migrations ORDER BY id');
  process.stdout.write(JSON.stringify({ migrations: res.rows || [] }, null, 2));
  process.stdout.write('\n');
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

