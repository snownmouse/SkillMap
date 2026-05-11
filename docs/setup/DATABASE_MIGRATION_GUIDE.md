# SkillMap 数据库迁移指南

本文档描述当前仓库的数据库切换机制、已知风险和迁移建议。

## 1. 当前支持的模式

SkillMap 当前保留两套数据库运行模式：

- SQLite：默认模式，适合本地开发和轻量测试
- PostgreSQL：面向更高并发与生产部署

切换条件来自环境变量：

```text
NODE_ENV=staging|production    -> 强制 PostgreSQL（必须配置 DB_HOST 等参数）
其他环境：
  DB_HOST 未设置或为空         -> SQLite
  DB_HOST=localhost            -> SQLite
  DB_HOST 为其他主机名或地址   -> PostgreSQL
```

## 2. 当前实现现状

当前仓库已引入版本化迁移与统一的 `query()` 访问风格（SQLite 通过适配器把 `$1`/`NOW()` 等转换为兼容语法），并在启动时自动执行迁移。
  
仍建议在切换到 PostgreSQL 前做完整接口联调与压测，确保业务链路、索引与连接池配置满足预期。

## 3. 迁移命令（推荐）

仓库提供一键迁移脚本：

```bash
# 执行 up 迁移（SQLite 或 PostgreSQL，取决于环境变量）
npm run db:migrate

# 查看已应用的迁移
npm run db:status

# 回滚最近 N 个迁移（默认 1 个）
MIGRATE_DOWN_STEPS=1 npm run db:rollback
```

CI 中也会执行 SQLite 与 PostgreSQL 的迁移冒烟，并对关键表做一致性校验（行数与哈希比对）。

## 4. 环境变量

### 3.1 SQLite

最小配置：

```bash
DB_PATH=./data/skillmap.db
```

### 3.2 PostgreSQL

```bash
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=skillmap
DB_USER=postgres
DB_PASSWORD=your-password
DB_MAX_CONNECTIONS=20
```

首次启用 PostgreSQL 前，请确保已安装依赖：

```bash
npm install
```

## 5. SQLite -> PostgreSQL 迁移步骤

### 4.1 准备 PostgreSQL

```sql
CREATE DATABASE skillmap;
```

### 4.2 修改 `.env`

填入 PostgreSQL 配置并保留原 SQLite 文件不删除。

### 4.3 启动服务

```bash
npm run dev
```

启动后系统会尝试：

- 创建连接池
- 初始化 PostgreSQL 表结构
- 挂载后端路由

### 4.4 先做空库联调

迁移前先验证以下内容是否可用：

- `/api/health`
- 登录/注册
- 技能树生成
- 节点对话
- WebSocket 建连

如果空库联调都失败，不要直接迁移历史数据。

### 5.5 再迁移业务数据（可选）

如果需要迁移已有 SQLite 数据，建议按表分批导出导入，而不是一次性全量脚本切换。

示例：

```bash
sqlite3 data/skillmap.db ".mode csv" ".output users.csv" "SELECT * FROM users;"
psql -h your-host -U postgres -d skillmap -c "\COPY users FROM 'users.csv' WITH CSV"
```

当前表数量已经明显多于早期版本，至少包括：

- `trees`
- `chat_messages`
- `tasks`
- `users`
- `sessions`
- `achievements`
- `learning_plans`
- `tree_versions`
- `tree_cache`
- `skill_terms`
- `tree_quality_scores`
- `login_attempts`
- `logs`
- `tree_feedback`
- `prompt_versions`
- `metrics_snapshots`

迁移时建议按业务重要度分批推进，而不是默认全量照搬。

## 6. PostgreSQL -> SQLite 回退

回退方式：

1. 移除或清空 `DB_HOST`
2. 保留 `DB_PATH`
3. 重新启动服务

```bash
npm run dev
```

注意：

- SQLite 回退只适合本地或低并发场景
- 如果当前数据只存在 PostgreSQL，需要先导出并准备 SQLite 导入方案
- 回退前应确认 SQLite 数据文件是否仍然有效

## 7. 风险清单

### 7.1 接口层风险

- 仍需持续检查新增代码是否保持 `query()` 风格，避免引入数据库专用 API
- 生产环境需关注索引、连接池与慢查询

### 7.2 运维风险

- PostgreSQL 需要额外维护连接池、备份与恢复
- SQLite 在多写入场景下更容易出现排队或锁竞争

### 7.3 数据迁移风险

- JSON 字段和时间字段在两种数据库中的处理方式不同
- 某些高级表已建但未完全接入主流程，导入优先级应后置

## 8. 推荐策略

| 场景 | 推荐数据库 | 说明 |
|------|------|------|
| 本地开发 | SQLite | 最省事，当前兼容性更稳 |
| 小规模内测 | SQLite 或 PostgreSQL | 取决于是否需要多人同时写入 |
| 高并发内测 | PostgreSQL | 但必须先跑完整联调 |
| 正式生产 | PostgreSQL | 更适合备份、恢复和并发访问 |

## 9. 迁移完成后的检查项

- [ ] 服务启动正常
- [ ] `/api/health` 返回正常
- [ ] 注册/登录可用
- [ ] 技能树生成成功
- [ ] 聊天记录能落库
- [ ] 任务状态能查询
- [ ] WebSocket 可连接
- [ ] 日志和监控不再报数据库相关错误
