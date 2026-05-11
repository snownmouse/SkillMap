import { config } from './config';
import { migrateUp } from './migrate';

let db: any = null;
let initPromise: Promise<any> | null = null;

export function getPool(): any {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
}

function createSqlitePoolAdapter(sqliteDb: any) {
  const normalizeSql = (sql: string) => {
    let out = sql;
    out = out.replace(/\$\d+/g, '?');
    out = out.replace(/\bNOW\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP');
    return out;
  };

  const query = async (text: string, params: any[] = []) => {
    const sql = normalizeSql(text);
    const trimmed = sql.trim().toUpperCase();
    const args = Array.isArray(params) ? params : [];
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      const rows = sqliteDb.prepare(sql).all(...args);
      return { rows, rowCount: rows.length };
    }
    const result = sqliteDb.prepare(sql).run(...args);
    return { rows: [], rowCount: result?.changes ?? 0 };
  };

  return {
    query,
    prepare: (...args: any[]) => sqliteDb.prepare(...args),
    exec: (...args: any[]) => sqliteDb.exec(...args),
    pragma: (...args: any[]) => sqliteDb.pragma(...args),
    close: (...args: any[]) => sqliteDb.close(...args),
  };
}

export async function initDatabase(): Promise<void> {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const mustUsePostgres = nodeEnv === 'production' || nodeEnv === 'staging';
    const hasPostgresConfig = Boolean(process.env.DB_HOST);
    if (mustUsePostgres && !hasPostgresConfig) {
      throw new Error('staging/production 环境必须配置 PostgreSQL（DB_HOST/DB_USER/DB_PASSWORD/DB_NAME）');
    }

    const usePostgres = mustUsePostgres || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost');
    
    if (usePostgres) {
      db = await initPostgres();
      await migrateUp(db, 'postgres');
    } else {
      const sqliteDb = await initSqlite();
      db = createSqlitePoolAdapter(sqliteDb);
      await migrateUp(db, 'sqlite');
    }
  })();
  
  await initPromise;
}

export function getDb(): any {
  return getPool();
}

export async function closePool(): Promise<void> {
  await closeDb();
}

export async function closeDb(): Promise<void> {
  if (db) {
    if (typeof db.close === 'function') {
      db.close();
    } else if (typeof db.end === 'function') {
      await db.end();
    }
    db = null;
  }
}

async function initSqlite(): Promise<any> {
  const { default: Database } = await import('better-sqlite3');
  const dbPath = process.env.DB_PATH || './data/skillmap.db';
  
  const db = new Database(dbPath);
  
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  
  console.log('[DB] SQLite 初始化完成:', dbPath);
  return db;
}

async function initPostgres(): Promise<any> {
  const { Pool } = await import('pg');
  
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    max: config.database.maxConnections,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err: any) => {
    console.error('[DB] PostgreSQL pool error:', err);
  });
  
  console.log('[DB] PostgreSQL 初始化完成:', config.database.host);
  return pool;
}

function initTablesSqlite(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trees (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      career TEXT NOT NULL,
      tree_data TEXT NOT NULL,
      partial INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    const columns = db.prepare("PRAGMA table_info(trees)").all() as Array<{ name: string }>;
    const hasPartial = columns.some(col => col.name === 'partial');
    if (!hasPartial) {
      db.exec(`ALTER TABLE trees ADD COLUMN partial INTEGER NOT NULL DEFAULT 0`);
    }
  } catch {
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      tree_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      tree_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      node_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_active_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_logs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      api_type TEXT NOT NULL DEFAULT 'chat',
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      total_tokens INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      success INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      request_id TEXT,
      tree_id TEXT,
      quality_score REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_abilities (
      id TEXT PRIMARY KEY,
      tree_id TEXT NOT NULL,
      skill TEXT NOT NULL,
      confidence TEXT NOT NULL CHECK(confidence IN ('high', 'medium', 'low')),
      source TEXT NOT NULL DEFAULT 'chat',
      node_id TEXT,
      discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
      progress INTEGER NOT NULL DEFAULT 0,
      stage TEXT NOT NULL DEFAULT 'pending',
      message TEXT NOT NULL DEFAULT '',
      tree_id TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      refresh_token TEXT,
      expires_at TEXT NOT NULL,
      refresh_expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_trees_user ON trees(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_trees_career ON trees(career)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_trees_user_career ON trees(user_id, career)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_trees_created ON trees(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_tree ON chat_messages(tree_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_node ON chat_messages(tree_id, node_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_llm_logs_created ON llm_logs(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_llm_logs_provider ON llm_logs(provider)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_llm_logs_tree ON llm_logs(tree_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_achievements_tree ON achievements(tree_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_learning_plans_user ON learning_plans(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_learning_plans_tree ON learning_plans(tree_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_learning_plans_status ON learning_plans(status)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      tree_id TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'default',
      type TEXT NOT NULL CHECK(type IN ('first_chat', 'node_complete', 'tree_half', 'tree_complete', 'streak_3', 'streak_7', 'streak_30', 'all_milestones', 'first_plan', 'custom')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      node_id TEXT,
      earned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_plans (
      id TEXT PRIMARY KEY,
      tree_id TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'default',
      title TEXT NOT NULL,
      description TEXT,
      focus_node_ids TEXT NOT NULL DEFAULT '[]',
      weekly_hours INTEGER NOT NULL DEFAULT 10,
      daily_tasks TEXT NOT NULL DEFAULT '{}',
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tree_versions (
      id TEXT PRIMARY KEY,
      tree_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      tree_data TEXT NOT NULL,
      change_description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tree_cache (
      id TEXT PRIMARY KEY,
      cache_key TEXT UNIQUE NOT NULL,
      tree_data TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      similarity_score REAL DEFAULT 0,
      prompt_version TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      hit_count INTEGER DEFAULT 0,
      last_accessed_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS skill_terms (
      id TEXT PRIMARY KEY,
      term TEXT NOT NULL,
      category TEXT NOT NULL,
      level INTEGER DEFAULT 3,
      related_terms TEXT,
      aliases TEXT,
      career_id TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tree_quality_scores (
      id TEXT PRIMARY KEY,
      tree_id TEXT NOT NULL UNIQUE,
      overall_score REAL NOT NULL,
      structure_score REAL NOT NULL,
      content_score REAL NOT NULL,
      user_feedback_score REAL,
      details TEXT,
      assessed_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      ip_address TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT NOT NULL,
      locked_until TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL CHECK(level IN ('error', 'warn', 'info', 'debug')),
      service TEXT NOT NULL DEFAULT 'server',
      event TEXT NOT NULL,
      request_id TEXT,
      user_id TEXT,
      tree_id TEXT,
      task_id TEXT,
      message TEXT NOT NULL,
      data TEXT,
      duration_ms INTEGER,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tree_feedback (
      id TEXT PRIMARY KEY,
      tree_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      issues TEXT,
      comment TEXT,
      suggested_edits TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_versions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      system_prompt TEXT NOT NULL,
      user_prompt_template TEXT NOT NULL,
      version TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'draft',
      avg_quality_score REAL DEFAULT 0,
      avg_generation_time REAL DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics_snapshots (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      data TEXT NOT NULL
    )
  `);
}

async function initTablesPostgres(pool: any) {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await client.query(`
      CREATE TABLE IF NOT EXISTS trees (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'default',
        career TEXT NOT NULL,
        tree_data TEXT NOT NULL,
        partial INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT NOW(),
        updated_at TEXT NOT NULL DEFAULT NOW()
      )
    `);

    try {
      const result = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'trees' AND column_name = 'partial'`
      );
      if ((result?.rowCount || 0) === 0) {
        await client.query(`ALTER TABLE trees ADD COLUMN partial INTEGER NOT NULL DEFAULT 0`);
      }
    } catch {
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_tree ON chat_messages(tree_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_node ON chat_messages(tree_id, node_id)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        node_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT NOW(),
        last_active_at TEXT NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS llm_logs (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        api_type TEXT NOT NULL DEFAULT 'chat',
        prompt_tokens INTEGER NOT NULL,
        completion_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL,
        success BOOLEAN NOT NULL DEFAULT FALSE,
        error_message TEXT,
        request_id TEXT,
        tree_id TEXT,
        quality_score REAL,
        created_at TEXT NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_llm_logs_created ON llm_logs(created_at)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_abilities (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        skill TEXT NOT NULL,
        confidence TEXT NOT NULL CHECK(confidence IN ('high', 'medium', 'low')),
        source TEXT NOT NULL DEFAULT 'chat',
        node_id TEXT,
        discovered_at TEXT NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
        progress INTEGER NOT NULL DEFAULT 0,
        stage TEXT NOT NULL DEFAULT 'pending',
        message TEXT NOT NULL DEFAULT '',
        tree_id TEXT,
        error TEXT,
        created_at TEXT NOT NULL DEFAULT NOW(),
        updated_at TEXT NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        created_at TEXT NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        refresh_token TEXT,
        expires_at TEXT NOT NULL,
        refresh_expires_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trees_user ON trees(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trees_career ON trees(career)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trees_user_career ON trees(user_id, career)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trees_created ON trees(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_llm_logs_provider ON llm_logs(provider)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_llm_logs_tree ON llm_logs(tree_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_achievements_tree ON achievements(tree_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_learning_plans_user ON learning_plans(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_learning_plans_tree ON learning_plans(tree_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_learning_plans_status ON learning_plans(status)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'default',
        type TEXT NOT NULL CHECK(type IN ('first_chat', 'node_complete', 'tree_half', 'tree_complete', 'streak_3', 'streak_7', 'streak_30', 'all_milestones', 'first_plan', 'custom')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        node_id TEXT,
        earned_at TEXT NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS learning_plans (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'default',
        title TEXT NOT NULL,
        description TEXT,
        focus_node_ids TEXT NOT NULL DEFAULT '[]',
        weekly_hours INTEGER NOT NULL DEFAULT 10,
        daily_tasks TEXT NOT NULL DEFAULT '{}',
        start_date TEXT NOT NULL,
        end_date TEXT,
        status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT NOW(),
        updated_at TEXT NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tree_versions (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        tree_data TEXT NOT NULL,
        change_description TEXT,
        created_at TEXT NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tree_cache (
        id TEXT PRIMARY KEY,
        cache_key TEXT UNIQUE NOT NULL,
        tree_data TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        similarity_score REAL DEFAULT 0,
        prompt_version TEXT NOT NULL,
        created_at TEXT DEFAULT NOW(),
        expires_at TEXT NOT NULL,
        hit_count INTEGER DEFAULT 0,
        last_accessed_at TEXT DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS skill_terms (
        id TEXT PRIMARY KEY,
        term TEXT NOT NULL,
        category TEXT NOT NULL,
        level INTEGER DEFAULT 3,
        related_terms TEXT,
        aliases TEXT,
        career_id TEXT NOT NULL,
        source TEXT DEFAULT 'manual',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT NOW(),
        created_by TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tree_quality_scores (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL UNIQUE,
        overall_score REAL NOT NULL,
        structure_score REAL NOT NULL,
        content_score REAL NOT NULL,
        user_feedback_score REAL,
        details TEXT,
        assessed_at TEXT DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id TEXT PRIMARY KEY,
        ip_address TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT NOT NULL,
        locked_until TEXT,
        created_at TEXT NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL CHECK(level IN ('error', 'warn', 'info', 'debug')),
        service TEXT NOT NULL DEFAULT 'server',
        event TEXT NOT NULL,
        request_id TEXT,
        user_id TEXT,
        tree_id TEXT,
        task_id TEXT,
        message TEXT NOT NULL,
        data TEXT,
        duration_ms INTEGER,
        error_message TEXT,
        created_at TEXT DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tree_feedback (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        rating INTEGER CHECK(rating BETWEEN 1 AND 5),
        issues TEXT,
        comment TEXT,
        suggested_edits TEXT,
        created_at TEXT DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS prompt_versions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        system_prompt TEXT NOT NULL,
        user_prompt_template TEXT NOT NULL,
        version TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'draft',
        avg_quality_score REAL DEFAULT 0,
        avg_generation_time REAL DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT NOW(),
        created_by TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS metrics_snapshots (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        data TEXT NOT NULL
      )
    `);
  } catch (error) {
    console.error('[DB] PostgreSQL table initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}
