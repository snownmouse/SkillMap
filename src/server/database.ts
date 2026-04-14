import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from './config';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
  }
  return db;
}

function initTables(db: Database.Database) {
  // 技能树表
  db.exec(`
    CREATE TABLE IF NOT EXISTS trees (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      career TEXT NOT NULL,
      tree_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 对话记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      tree_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
    )
  `);

  // 对话会话表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      tree_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      node_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
    )
  `);

  // LLM调用日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_logs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      total_tokens INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      success BOOLEAN NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_trees_user ON trees(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_tree ON chat_messages(tree_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_node ON chat_messages(tree_id, node_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_llm_logs_created ON llm_logs(created_at)`);
}
