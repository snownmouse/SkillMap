# SkillMap 回滚预案

本文档描述当前仓库的实际回滚策略，优先面向以下几类问题：

- 新版本代码导致 API 或页面不可用
- 模型供应商配置错误，生成与对话全部失败
- 数据库切换或迁移后出现读写异常
- 构建产物异常，前端白屏或静态资源加载失败

## 1. 回滚原则

- 优先回滚配置，再回滚代码，最后回滚数据
- 优先使用可审计的 Git 操作，不直接覆盖未知变更
- 回滚后必须做健康检查与关键流程验证
- SQLite 和 PostgreSQL 的回滚方式不同，先确认当前运行模式

## 2. 先判断当前故障类型

| 故障类型 | 典型现象 | 首选动作 |
|------|------|------|
| 模型不可用 | 生成、对话全部报错 | 切换 `LLM_PROVIDER` 或修正 API Key |
| 前端白屏 | 页面打不开、静态资源 404 | 回滚 `dist` 或回退前端代码 |
| 后端接口异常 | `/api/*` 返回 500 | 回滚后端代码或配置 |
| 数据库异常 | 登录、树保存、对话落库失败 | 确认数据库模式并恢复备份 |
| 全量故障 | 启动失败、接口与页面都异常 | 回滚代码 + 配置 + 数据 |

## 3. 代码回滚

### 3.1 推荐做法

```bash
# 查看最近提交
git log --oneline -10

# 切换到目标提交进行验证
git checkout <commit-hash>

# 安装依赖
npm install

# 启动验证
npm run dev
```

如果目标版本验证通过，再根据你的发布方式决定是否切回分支、重新打包或重新部署。

### 3.2 生产环境回滚建议

- 如果你是用 PM2 启动，建议重新部署上一版代码后再执行 `pm2 restart skillmap`
- 如果你是用构建产物部署，建议直接替换上一版 `dist`，避免在故障机器上临时编译
- 如果当前工作区有未提交改动，不要直接执行破坏性 Git 命令

## 4. 配置回滚

模型或环境变量出问题时，通常不需要先动代码。

### 4.1 切换 LLM Provider

```bash
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

常见备用方案：

- `ark` 不可用时切 `deepseek` 或 `siliconflow`
- 真实模型全部不可用时切 `dummy`，只验证前后端链路
- `custom` 模式异常时，先检查 `CUSTOM_LLM_BASE_URL` 是否仍然有效

### 4.2 端口与跨域

如果只是端口冲突或跨域错误，优先检查：

```bash
PORT=3000
CORS_ORIGIN=*
```

## 5. 数据库回滚

### 5.1 SQLite

当前默认是 SQLite。数据库文件通常位于：

```bash
./data/skillmap.db
```

回滚步骤：

```bash
# 先停止服务
# 再恢复备份文件
copy data\\skillmap.db.backup data\\skillmap.db

# 重新启动
npm run dev
```

注意：

- 先确认备份文件是可信版本
- 不要在服务运行中直接覆盖 SQLite 文件
- 如果存在 `-wal` 或 `-shm` 文件，建议停服务后一起处理

### 5.2 PostgreSQL

PostgreSQL 模式下，当前代码会依赖：

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

恢复示例：

```bash
pg_restore -h your-host -U postgres -d skillmap backup_file.dump
```

或使用 SQL 文本备份：

```bash
psql -h your-host -U postgres -d skillmap < backup.sql
```

## 6. 备份现状说明

仓库中已经有 `BackupService`，并支持：

- PostgreSQL `pg_dump`
- 旧备份清理
- 僵尸任务清理

但当前代码并没有在主启动流程中默认启用定时备份，因此不能把“自动每日备份”当作既成事实。上线前请单独确认：

- 是否已在部署脚本中显式调用备份逻辑
- 是否存在真正可恢复的备份文件
- 备份路径是否纳入磁盘持久化策略

## 7. 构建产物回滚

如果问题只出在前端页面，可只回滚静态产物：

1. 替换上一版 `dist`
2. 保留当前后端代码不变
3. 重新访问首页和关键页面验证

适用场景：

- 首页白屏
- 路由跳转失效
- 资源文件 404
- 样式大面积异常

## 8. 回滚后验证清单

至少验证以下项目：

- [ ] 服务能正常启动
- [ ] `GET /api/health` 返回 200
- [ ] 首页与生成页可访问
- [ ] 技能树生成接口可用
- [ ] 节点对话接口可用
- [ ] 数据库连接正常
- [ ] WebSocket 可建立连接
- [ ] 当前 `.env` 与目标版本匹配

## 9. 建议补充

为避免下次回滚继续靠人工排查，建议补齐：

- 发布记录与版本号映射
- SQLite 与 PostgreSQL 的独立备份脚本
- 生产环境 `.env` 模板
- 回滚前后验证脚本
