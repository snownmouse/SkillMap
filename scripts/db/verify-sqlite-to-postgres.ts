import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import { migrateDown, migrateUp } from '../../src/server/migrate';

async function createSqliteAdapter(dbPath: string) {
  const { default: Database } = await import('better-sqlite3');
  const raw = new Database(dbPath);
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');
  raw.pragma('busy_timeout = 5000');

  const normalizeSql = (sql: string) => sql.replace(/\$\d+/g, '?').replace(/\bNOW\(\)\b/g, 'CURRENT_TIMESTAMP');

  const query = async (text: string, params: any[] = []) => {
    const sql = normalizeSql(text);
    const trimmed = sql.trim().toUpperCase();
    const args = Array.isArray(params) ? params : [];
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      const rows = raw.prepare(sql).all(...args);
      return { rows, rowCount: rows.length };
    }
    const result = raw.prepare(sql).run(...args);
    return { rows: [], rowCount: result?.changes ?? 0 };
  };

  return {
    query,
    close: () => raw.close()
  };
}

async function createPostgresPool() {
  const { Pool } = await import('pg');
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 2
  });
  return pool;
}

function stableJsonHash(input: any) {
  const json = JSON.stringify(input);
  return crypto.createHash('sha256').update(json).digest('hex');
}

function normalizeRow(row: any) {
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    if (v == null) {
      out[k] = null;
      continue;
    }
    if (typeof v === 'string' && (k.endsWith('_at') || k === 'timestamp' || k.endsWith('_date'))) {
      const d = new Date(v);
      out[k] = Number.isNaN(d.getTime()) ? v : d.toISOString();
      continue;
    }
    out[k] = v;
  }
  return out;
}

async function exportTable(db: any, table: string) {
  const res = await db.query(`SELECT * FROM ${table}`);
  const rows = (res.rows || []).map(normalizeRow).sort((a: any, b: any) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return { count: rows.length, hash: stableJsonHash(rows), rows };
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillmap-migrate-'));
  const sqlitePath = path.join(tmpDir, 'skillmap.db');

  const sqlite = await createSqliteAdapter(sqlitePath);
  await migrateUp(sqlite, 'sqlite');

  const userId = 'u_demo';
  const treeId = 't_demo';
  const sessionId = 's_demo';
  const goalId = 'g_demo';
  const planId = 'p_demo';
  const token = 'tok_demo';
  const refreshToken = 'rt_demo';

  await sqlite.query('INSERT INTO users (id, username, password_hash, display_name) VALUES ($1,$2,$3,$4)', [userId, 'demo', 'hash', 'Demo']);
  await sqlite.query('INSERT INTO sessions (id, user_id, token, refresh_token, expires_at, refresh_expires_at) VALUES ($1,$2,$3,$4,$5,$6)', [
    sessionId,
    userId,
    token,
    refreshToken,
    '2030-01-01T00:00:00.000Z',
    '2030-01-02T00:00:00.000Z'
  ]);

  const treeData = {
    version: '1.0',
    career: 'demo',
    summary: 'demo',
    generatedAt: '2026-05-05T00:00:00.000Z',
    nodes: {
      n1: { id: 'n1', name: 'N1', description: '', category: 'core', difficulty: 'beginner', status: 'available', progress: 0, dependencies: [], resources: [], learningObjectives: [], deliverables: [], subSkills: [], conversations: [], aiPendingMessage: null, lastActive: null, milestone: 'B', estimatedHours: 3 }
    },
    edges: [],
    categories: [],
    timeline: []
  };

  await sqlite.query('INSERT INTO trees (id, user_id, career, tree_data, partial) VALUES ($1,$2,$3,$4,$5)', [treeId, userId, 'demo', JSON.stringify(treeData), 0]);
  await sqlite.query('INSERT INTO chat_messages (id, tree_id, node_id, role, content, metadata) VALUES ($1,$2,$3,$4,$5,$6)', [
    'm_demo',
    treeId,
    'n1',
    'user',
    'hello',
    JSON.stringify({ a: 1 })
  ]);
  await sqlite.query('INSERT INTO growth_goals (id, user_id, title, description, target_date) VALUES ($1,$2,$3,$4,$5)', [goalId, userId, 'goal', 'desc', '2030-01-01T00:00:00.000Z']);
  await sqlite.query('INSERT INTO growth_plans (id, goal_id, user_id, active_path, plan_data) VALUES ($1,$2,$3,$4,$5)', [planId, goalId, userId, 'tech', JSON.stringify({ treeId, plan: { ok: true } })]);

  const sqliteExport = {
    users: await exportTable(sqlite, 'users'),
    sessions: await exportTable(sqlite, 'sessions'),
    trees: await exportTable(sqlite, 'trees'),
    chat_messages: await exportTable(sqlite, 'chat_messages'),
    growth_goals: await exportTable(sqlite, 'growth_goals'),
    growth_plans: await exportTable(sqlite, 'growth_plans')
  };

  const pg = await createPostgresPool();
  await migrateDown(pg, 'postgres', 1).catch(() => {});
  await migrateUp(pg, 'postgres');

  await pg.query('INSERT INTO users (id, username, password_hash, display_name, created_at) VALUES ($1,$2,$3,$4, NOW())', [userId, 'demo', 'hash', 'Demo']);
  await pg.query('INSERT INTO sessions (id, user_id, token, refresh_token, expires_at, refresh_expires_at) VALUES ($1,$2,$3,$4,$5,$6)', [
    sessionId,
    userId,
    token,
    refreshToken,
    '2030-01-01T00:00:00.000Z',
    '2030-01-02T00:00:00.000Z'
  ]);
  await pg.query('INSERT INTO trees (id, user_id, career, tree_data, partial, created_at, updated_at) VALUES ($1,$2,$3,$4,$5, NOW(), NOW())', [treeId, userId, 'demo', JSON.stringify(treeData), 0]);
  await pg.query('INSERT INTO chat_messages (id, tree_id, node_id, role, content, metadata, created_at) VALUES ($1,$2,$3,$4,$5,$6, NOW())', [
    'm_demo',
    treeId,
    'n1',
    'user',
    'hello',
    JSON.stringify({ a: 1 })
  ]);
  await pg.query('INSERT INTO growth_goals (id, user_id, title, description, target_date, created_at) VALUES ($1,$2,$3,$4,$5, NOW())', [goalId, userId, 'goal', 'desc', '2030-01-01T00:00:00.000Z']);
  await pg.query('INSERT INTO growth_plans (id, goal_id, user_id, active_path, plan_data, created_at, updated_at) VALUES ($1,$2,$3,$4,$5, NOW(), NOW())', [planId, goalId, userId, 'tech', JSON.stringify({ treeId, plan: { ok: true } })]);

  const pgExport = {
    users: await exportTable(pg, 'users'),
    sessions: await exportTable(pg, 'sessions'),
    trees: await exportTable(pg, 'trees'),
    chat_messages: await exportTable(pg, 'chat_messages'),
    growth_goals: await exportTable(pg, 'growth_goals'),
    growth_plans: await exportTable(pg, 'growth_plans')
  };

  const diffs: any[] = [];
  for (const k of Object.keys(sqliteExport) as Array<keyof typeof sqliteExport>) {
    const a = sqliteExport[k];
    const b = pgExport[k];
    if (a.count !== b.count || a.hash !== b.hash) {
      diffs.push({ table: k, sqlite: { count: a.count, hash: a.hash }, postgres: { count: b.count, hash: b.hash } });
    }
  }

  await pg.end();
  sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });

  if (diffs.length) {
    process.stderr.write(JSON.stringify({ ok: false, diffs }, null, 2));
    process.stderr.write('\n');
    process.exit(1);
  }

  process.stdout.write(JSON.stringify({ ok: true }, null, 2));
  process.stdout.write('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

