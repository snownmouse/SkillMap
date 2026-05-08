import { migrations, sortMigrations, type MigrationDialect } from './migrations';

async function withClient<T>(pool: any, fn: (client: any) => Promise<T>): Promise<T> {
  if (pool && typeof pool.connect === 'function') {
    const client = await pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }
  return await fn(pool);
}

async function ensureMigrationsTable(client: any, dialect: MigrationDialect) {
  const sql = dialect === 'postgres'
    ? `CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    : `CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`;
  await client.query(sql);
}

async function getAppliedMigrationIds(client: any): Promise<Set<string>> {
  const res = await client.query('SELECT id FROM schema_migrations ORDER BY id');
  const ids = new Set<string>();
  for (const row of res.rows || []) {
    if (row?.id) ids.add(String(row.id));
  }
  return ids;
}

export async function migrateUp(pool: any, dialect: MigrationDialect): Promise<{ applied: string[] }> {
  const applied: string[] = [];
  const list = sortMigrations(migrations);

  await withClient(pool, async (client) => {
    await ensureMigrationsTable(client, dialect);
    const appliedIds = await getAppliedMigrationIds(client);

    await client.query('BEGIN');
    try {
      for (const m of list) {
        if (appliedIds.has(m.id)) continue;
        for (const stmt of m.up[dialect]) {
          await client.query(stmt);
        }
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id]);
        applied.push(m.id);
      }
      await client.query('COMMIT');
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {
      }
      throw e;
    }
  });

  return { applied };
}

export async function migrateDown(pool: any, dialect: MigrationDialect, steps: number = 1): Promise<{ rolledBack: string[] }> {
  const rolledBack: string[] = [];
  const list = sortMigrations(migrations);
  const byId = new Map(list.map(m => [m.id, m]));

  await withClient(pool, async (client) => {
    await ensureMigrationsTable(client, dialect);
    const res = await client.query('SELECT id FROM schema_migrations ORDER BY id DESC');
    const ids = (res.rows || []).map((r: any) => String(r.id));
    const target = ids.slice(0, Math.max(0, steps));

    await client.query('BEGIN');
    try {
      for (const id of target) {
        const m = byId.get(id);
        if (!m) continue;
        for (const stmt of m.down[dialect]) {
          await client.query(stmt);
        }
        await client.query('DELETE FROM schema_migrations WHERE id = $1', [id]);
        rolledBack.push(id);
      }
      await client.query('COMMIT');
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {
      }
      throw e;
    }
  });

  return { rolledBack };
}

