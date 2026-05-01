# SkillMap 回滚预案

## 1. 回滚场景

| 场景 | 回滚方式 | 预计耗时 |
|------|---------|---------|
| 新版本 API 报错 | Git 回滚 + PM2 重启 | 2 分钟 |
| 数据库出问题 | 数据库备份恢复 | 5-10 分钟 |
| LLM 服务挂了 | 切换备用 Provider | 1 分钟 |
| 前端白屏 | 回滚静态文件 | 3 分钟 |
| 全量回滚 | Git + 数据库 + 重启 | 10 分钟 |

## 2. 快速回滚步骤

### 2.1 代码回滚

```bash
# 1. 查看提交历史
git log --oneline -10

# 2. 回滚到指定版本
git reset --hard <commit-hash>

# 3. 重新安装依赖（如果 package.json 有变化）
npm install

# 4. 重启服务
pm2 restart skillmap
```

### 2.2 数据库回滚

#### SQLite
```bash
# 恢复备份文件
cp data/skillmap.db.backup data/skillmap.db
pm2 restart skillmap
```

#### PostgreSQL
```bash
# 从备份恢复
pg_restore -h your-host -U postgres -d skillmap backup_file.dump
pm2 restart skillmap
```

### 2.3 LLM Provider 切换

```bash
# 修改 .env 文件
LLM_PROVIDER=deepseek  # 从 ark 切换到 deepseek
DEEPSEEK_API_KEY=your-key

# 重启服务
pm2 restart skillmap
```

## 3. 数据库备份

### 3.1 自动备份（推荐）

服务器启动时自动每天备份一次：

```bash
# 备份文件位置
data/backups/skillmap_YYYYMMDD.db
```

### 3.2 手动备份

```bash
# SQLite
cp data/skillmap.db data/skillmap.db.backup

# PostgreSQL
pg_dump -h your-host -U postgres skillmap > backup.sql
```

## 4. 回滚验证

回滚后需要验证：

- [ ] 服务器正常启动
- [ ] 健康检查接口正常 (`/api/health`)
- [ ] 登录功能正常
- [ ] 技能树生成正常
- [ ] 对话功能正常
- [ ] 数据库连接正常

## 5. 紧急联系人

| 角色 | 联系方式 |
|------|---------|
| 开发负责人 | 待填写 |
| 运维负责人 | 待填写 |
| LLM 服务商 | 待填写 |
