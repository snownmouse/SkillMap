export type MigrationDialect = 'sqlite' | 'postgres';

export interface Migration {
  id: string;
  up: Record<MigrationDialect, string[]>;
  down: Record<MigrationDialect, string[]>;
  seed?: Record<MigrationDialect, string[]>;
}

export const migration_0001_initial: Migration = {
  id: '0001_initial',
  up: {
    sqlite: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        refresh_token TEXT,
        expires_at TEXT NOT NULL,
        refresh_expires_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,

      `CREATE TABLE IF NOT EXISTS trees (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'default',
        career TEXT NOT NULL,
        tree_data TEXT NOT NULL,
        partial INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_trees_user ON trees(user_id)`,

      `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_tree ON chat_messages(tree_id)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_node ON chat_messages(tree_id, node_id)`,

      `CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        node_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_active_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS llm_logs (
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
      )`,
      `CREATE INDEX IF NOT EXISTS idx_llm_logs_created ON llm_logs(created_at)`,

      `CREATE TABLE IF NOT EXISTS user_abilities (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        skill TEXT NOT NULL,
        confidence TEXT NOT NULL CHECK(confidence IN ('high', 'medium', 'low')),
        source TEXT NOT NULL DEFAULT 'chat',
        node_id TEXT,
        discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
        progress INTEGER NOT NULL DEFAULT 0,
        stage TEXT NOT NULL DEFAULT 'pending',
        message TEXT NOT NULL DEFAULT '',
        tree_id TEXT,
        error TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'default',
        type TEXT NOT NULL CHECK(type IN ('first_chat', 'node_complete', 'tree_half', 'tree_complete', 'streak_3', 'streak_7', 'streak_30', 'all_milestones', 'first_plan', 'custom')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        node_id TEXT,
        earned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS learning_plans (
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
      )`,

      `CREATE TABLE IF NOT EXISTS tree_versions (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        tree_data TEXT NOT NULL,
        change_description TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS tree_cache (
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
      )`,

      `CREATE TABLE IF NOT EXISTS skill_terms (
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
      )`,

      `CREATE TABLE IF NOT EXISTS tree_quality_scores (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL UNIQUE,
        overall_score REAL NOT NULL,
        structure_score REAL NOT NULL,
        content_score REAL NOT NULL,
        user_feedback_score REAL,
        details TEXT,
        assessed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS login_attempts (
        id TEXT PRIMARY KEY,
        ip_address TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT NOT NULL,
        locked_until TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS logs (
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
      )`,

      `CREATE TABLE IF NOT EXISTS tree_feedback (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        rating INTEGER CHECK(rating BETWEEN 1 AND 5),
        issues TEXT,
        comment TEXT,
        suggested_edits TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS prompt_versions (
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
      )`,

      `CREATE TABLE IF NOT EXISTS metrics_snapshots (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        data TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS node_resources (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('text', 'video', 'code', 'image', 'link')),
        title TEXT NOT NULL,
        url TEXT,
        content TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_node_resources_node ON node_resources(tree_id, node_id)`,

      `CREATE TABLE IF NOT EXISTS growth_goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        target_date TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_growth_goals_user ON growth_goals(user_id)`,

      `CREATE TABLE IF NOT EXISTS growth_plans (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        active_path TEXT NOT NULL CHECK(active_path IN ('tech', 'management', 'slash')),
        plan_data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES growth_goals(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_growth_plans_goal ON growth_plans(goal_id)`,

      `CREATE TABLE IF NOT EXISTS group_chats (
        id TEXT PRIMARY KEY,
        tree_id TEXT,
        node_id TEXT,
        name TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'public')),
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_group_chats_tree_node ON group_chats(tree_id, node_id)`,

      `CREATE TABLE IF NOT EXISTS group_chat_members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'coach', 'member')),
        joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES group_chats(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_chat_members(user_id)`,

      `CREATE TABLE IF NOT EXISTS group_chat_messages (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES group_chats(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_chat_messages(group_id, created_at)`,

      `CREATE TABLE IF NOT EXISTS coaches (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        capacity INTEGER NOT NULL DEFAULT 5,
        active_sessions INTEGER NOT NULL DEFAULT 0,
        rating REAL DEFAULT 5,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS coaching_matches (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        tree_id TEXT,
        node_id TEXT,
        coach_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'ended')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ended_at TEXT,
        FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_coaching_matches_user ON coaching_matches(user_id, status)`
    ],
    postgres: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        refresh_token TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        refresh_expires_at TIMESTAMPTZ,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,

      `CREATE TABLE IF NOT EXISTS trees (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'default',
        career TEXT NOT NULL,
        tree_data TEXT NOT NULL,
        partial INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_trees_user ON trees(user_id)`,

      `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        metadata TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_tree ON chat_messages(tree_id)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_node ON chat_messages(tree_id, node_id)`,

      `CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        node_name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS llm_logs (
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_llm_logs_created ON llm_logs(created_at)`,

      `CREATE TABLE IF NOT EXISTS user_abilities (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        skill TEXT NOT NULL,
        confidence TEXT NOT NULL CHECK(confidence IN ('high', 'medium', 'low')),
        source TEXT NOT NULL DEFAULT 'chat',
        node_id TEXT,
        discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
        progress INTEGER NOT NULL DEFAULT 0,
        stage TEXT NOT NULL DEFAULT 'pending',
        message TEXT NOT NULL DEFAULT '',
        tree_id TEXT,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'default',
        type TEXT NOT NULL CHECK(type IN ('first_chat', 'node_complete', 'tree_half', 'tree_complete', 'streak_3', 'streak_7', 'streak_30', 'all_milestones', 'first_plan', 'custom')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        node_id TEXT,
        earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS learning_plans (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'default',
        title TEXT NOT NULL,
        description TEXT,
        focus_node_ids TEXT NOT NULL DEFAULT '[]',
        weekly_hours INTEGER NOT NULL DEFAULT 10,
        daily_tasks TEXT NOT NULL DEFAULT '{}',
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ,
        status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS tree_versions (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        tree_data TEXT NOT NULL,
        change_description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS tree_cache (
        id TEXT PRIMARY KEY,
        cache_key TEXT UNIQUE NOT NULL,
        tree_data TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        similarity_score REAL DEFAULT 0,
        prompt_version TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        hit_count INTEGER DEFAULT 0,
        last_accessed_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS skill_terms (
        id TEXT PRIMARY KEY,
        term TEXT NOT NULL,
        category TEXT NOT NULL,
        level INTEGER DEFAULT 3,
        related_terms TEXT,
        aliases TEXT,
        career_id TEXT NOT NULL,
        source TEXT DEFAULT 'manual',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS tree_quality_scores (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL UNIQUE,
        overall_score REAL NOT NULL,
        structure_score REAL NOT NULL,
        content_score REAL NOT NULL,
        user_feedback_score REAL,
        details TEXT,
        assessed_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS login_attempts (
        id TEXT PRIMARY KEY,
        ip_address TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TIMESTAMPTZ NOT NULL,
        locked_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS logs (
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
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS tree_feedback (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        rating INTEGER CHECK(rating BETWEEN 1 AND 5),
        issues TEXT,
        comment TEXT,
        suggested_edits TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS prompt_versions (
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
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS metrics_snapshots (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        data TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS node_resources (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('text', 'video', 'code', 'image', 'link')),
        title TEXT NOT NULL,
        url TEXT,
        content TEXT,
        metadata TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_node_resources_node ON node_resources(tree_id, node_id)`,

      `CREATE TABLE IF NOT EXISTS growth_goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        target_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_growth_goals_user ON growth_goals(user_id)`,

      `CREATE TABLE IF NOT EXISTS growth_plans (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        active_path TEXT NOT NULL CHECK(active_path IN ('tech', 'management', 'slash')),
        plan_data TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (goal_id) REFERENCES growth_goals(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_growth_plans_goal ON growth_plans(goal_id)`,

      `CREATE TABLE IF NOT EXISTS group_chats (
        id TEXT PRIMARY KEY,
        tree_id TEXT,
        node_id TEXT,
        name TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'public')),
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_group_chats_tree_node ON group_chats(tree_id, node_id)`,

      `CREATE TABLE IF NOT EXISTS group_chat_members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'coach', 'member')),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES group_chats(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_chat_members(user_id)`,

      `CREATE TABLE IF NOT EXISTS group_chat_messages (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (group_id) REFERENCES group_chats(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_chat_messages(group_id, created_at)`,

      `CREATE TABLE IF NOT EXISTS coaches (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        capacity INTEGER NOT NULL DEFAULT 5,
        active_sessions INTEGER NOT NULL DEFAULT 0,
        rating REAL DEFAULT 5,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS coaching_matches (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        tree_id TEXT,
        node_id TEXT,
        coach_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'ended')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_coaching_matches_user ON coaching_matches(user_id, status)`
    ]
  },
  down: {
    sqlite: [
      'DROP TABLE IF EXISTS coaching_matches',
      'DROP TABLE IF EXISTS coaches',
      'DROP TABLE IF EXISTS group_chat_messages',
      'DROP TABLE IF EXISTS group_chat_members',
      'DROP TABLE IF EXISTS group_chats',
      'DROP TABLE IF EXISTS growth_plans',
      'DROP TABLE IF EXISTS growth_goals',
      'DROP TABLE IF EXISTS node_resources',
      'DROP TABLE IF EXISTS metrics_snapshots',
      'DROP TABLE IF EXISTS prompt_versions',
      'DROP TABLE IF EXISTS tree_feedback',
      'DROP TABLE IF EXISTS logs',
      'DROP TABLE IF EXISTS login_attempts',
      'DROP TABLE IF EXISTS tree_quality_scores',
      'DROP TABLE IF EXISTS skill_terms',
      'DROP TABLE IF EXISTS tree_cache',
      'DROP TABLE IF EXISTS tree_versions',
      'DROP TABLE IF EXISTS learning_plans',
      'DROP TABLE IF EXISTS achievements',
      'DROP TABLE IF EXISTS tasks',
      'DROP TABLE IF EXISTS user_abilities',
      'DROP TABLE IF EXISTS llm_logs',
      'DROP TABLE IF EXISTS chat_sessions',
      'DROP TABLE IF EXISTS chat_messages',
      'DROP TABLE IF EXISTS trees',
      'DROP TABLE IF EXISTS sessions',
      'DROP TABLE IF EXISTS users',
      'DROP TABLE IF EXISTS schema_migrations'
    ],
    postgres: [
      'DROP TABLE IF EXISTS coaching_matches',
      'DROP TABLE IF EXISTS coaches',
      'DROP TABLE IF EXISTS group_chat_messages',
      'DROP TABLE IF EXISTS group_chat_members',
      'DROP TABLE IF EXISTS group_chats',
      'DROP TABLE IF EXISTS growth_plans',
      'DROP TABLE IF EXISTS growth_goals',
      'DROP TABLE IF EXISTS node_resources',
      'DROP TABLE IF EXISTS metrics_snapshots',
      'DROP TABLE IF EXISTS prompt_versions',
      'DROP TABLE IF EXISTS tree_feedback',
      'DROP TABLE IF EXISTS logs',
      'DROP TABLE IF EXISTS login_attempts',
      'DROP TABLE IF EXISTS tree_quality_scores',
      'DROP TABLE IF EXISTS skill_terms',
      'DROP TABLE IF EXISTS tree_cache',
      'DROP TABLE IF EXISTS tree_versions',
      'DROP TABLE IF EXISTS learning_plans',
      'DROP TABLE IF EXISTS achievements',
      'DROP TABLE IF EXISTS tasks',
      'DROP TABLE IF EXISTS user_abilities',
      'DROP TABLE IF EXISTS llm_logs',
      'DROP TABLE IF EXISTS chat_sessions',
      'DROP TABLE IF EXISTS chat_messages',
      'DROP TABLE IF EXISTS trees',
      'DROP TABLE IF EXISTS sessions',
      'DROP TABLE IF EXISTS users',
      'DROP TABLE IF EXISTS schema_migrations'
    ]
  }
};

