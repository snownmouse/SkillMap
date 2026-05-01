# SkillMap 数据库迁移指南

## 1. 概述

SkillMap 支持双数据库模式：SQLite（内测/开发）和 PostgreSQL（生产/高并发）。本文档说明如何在两种模式之间切换。

## 2. 自动切换机制

项目通过 `DB_HOST` 环境变量自动判断使用哪种数据库：

```
DB_HOST 未设置 或 DB_HOST=localhost  →  SQLite 模式
DB_HOST 设置了其他值                →  PostgreSQL 模式
```

## 3. SQLite → PostgreSQL 迁移

### 3.1 准备工作

1. 安装 PostgreSQL（本地或云服务）
2. 创建数据库：
   ```sql
   CREATE DATABASE skillmap;
   ```
3. 确保项目依赖包含 `pg`：
   ```bash
   npm install pg
   ```

### 3.2 配置环境变量

在 `.env` 文件中添加：

```bash
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=skillmap
DB_USER=postgres
DB_PASSWORD=your-password
DB_MAX_CONNECTIONS=20
```

### 3.3 启动服务器

```bash
npm run dev
```

服务器启动时会自动：
1. 检测到 `DB_HOST` 配置
2. 使用 PostgreSQL 连接池
3. 自动创建所有表结构

### 3.4 数据迁移

如果需要将 SQLite 中的数据迁移到 PostgreSQL：

```bash
# 使用 SQLite 导出 CSV
sqlite3 data/skillmap.db ".mode csv" ".output users.csv" "SELECT * FROM users;"

# 使用 PostgreSQL 导入
psql -h your-host -U postgres -d skillmap -c "\COPY users FROM 'users.csv' WITH CSV HEADER;"
```

### 3.5 验证迁移

```bash
curl http://localhost:3002/api/health
```

## 4. PostgreSQL → SQLite 回退

### 4.1 操作步骤

1. 移除 `.env` 中的 `DB_HOST` 配置（或注释掉）
2. 重启服务器：
   ```bash
   npm run dev
   ```

服务器会自动切换回 SQLite 模式。

## 5. SQL 语法差异

项目代码已处理了以下差异：

| 特性 | SQLite | PostgreSQL |
|------|--------|------------|
| 参数占位符 | `?` | `$1, $2, ...` |
| 布尔类型 | `INTEGER (0/1)` | `BOOLEAN` |
| 自增主键 | `AUTOINCREMENT` | `SERIAL` 或 `TEXT` |
| 当前时间 | `datetime('now')` | `NOW()` |
| 插入替换 | `INSERT OR REPLACE` | `INSERT ... ON CONFLICT DO UPDATE` |
| 数据库大小 | `pragma page_count` | `pg_database_size()` |

## 6. 性能对比

| 指标 | SQLite | PostgreSQL |
|------|--------|------------|
| 最大并发写入 | ~1（串行） | 数百+ |
| 连接池 | 不支持 | 支持 |
| 200 并发稳定性 | ⚠️ 可能出现 BUSY | ✅ 稳定 |
| 部署复杂度 | 零配置 | 需要安装配置 |
| 数据安全 | 文件级 | 支持主备、备份 |
| 成本 | 免费 | 免费（自建）/ 付费（云） |

## 7. 推荐方案

| 阶段 | 推荐 | 原因 |
|------|------|------|
| 内测初期 | SQLite | 零成本，快速启动 |
| 内测后期（50+ 用户） | PostgreSQL | 并发需求 |
| 正式上线 | PostgreSQL | 数据安全、稳定性 |
