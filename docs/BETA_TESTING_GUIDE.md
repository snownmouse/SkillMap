# SkillMap 内测指南

## 1. 内测概述

SkillMap 当前处于 MVP 内测阶段，所有功能（登录、对话、技能树生成等）均在测试范围内。

### 1.1 内测规模
- **预计人数**: 50+ 用户
- **最大并发**: 约 200
- **内测周期**: 待定

### 1.2 内测目标
- 验证核心功能正常运行
- 收集用户反馈
- 发现潜在问题
- 验证系统在 200 并发下的稳定性

## 2. 部署方案

### 2.1 内测部署架构

```
IGA Pages（火山引擎）
    ↓ 连接
自建 PostgreSQL / SQLite
```

### 2.2 数据库选择

| 阶段 | 数据库 | 原因 |
|------|--------|------|
| **内测初期** | SQLite | 零成本，快速启动 |
| **内测后期** | PostgreSQL | 高并发需要，数据安全 |

### 2.3 SQLite 内测注意事项
- SQLite 使用 WAL 模式 + busy_timeout=5000ms
- 200 并发下可能出现写入排队
- 如果出现 `SQLITE_BUSY` 错误，需要切换到 PostgreSQL

## 3. 环境配置

### 3.1 SQLite 模式（推荐内测初期使用）

`.env` 配置：
```bash
PORT=3002
LLM_PROVIDER=ark
ARK_API_KEY=your-key
```

### 3.2 PostgreSQL 模式

`.env` 配置：
```bash
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=skillmap
DB_USER=postgres
DB_PASSWORD=your-password
DB_MAX_CONNECTIONS=20
PORT=3002
LLM_PROVIDER=ark
ARK_API_KEY=your-key
```

## 4. 监控与告警

### 4.1 监控端点

| 端点 | 说明 |
|------|------|
| `GET /api/health` | 健康检查 |
| `GET /api/metrics` | API 指标（响应时间、错误率） |

### 4.2 告警规则

| 规则 | 阈值 | 说明 |
|------|------|------|
| API 错误率 | > 5% | 最近 5 分钟 |
| LLM 连续失败 | 3 次 | 实时 |
| 数据库连接池耗尽 | 等待 > 5 | 实时 |
| 响应时间 P95 | > 10s | 最近 5 分钟 |

### 4.3 日志查看

服务器日志输出到控制台，包含：
- 请求追踪（请求 ID、耗时）
- 慢请求告警（> 3s）
- LLM 调用记录
- 错误日志

## 5. 限流配置

### 5.1 LLM 调用限流

| 接口 | 限制 |
|------|------|
| AI 对话 | 每用户 30 次/小时 |
| 全局 LLM 调用 | 100 次/分钟 |

### 5.2 API 速率限制（生产环境）

| 接口 | 限制 |
|------|------|
| 认证接口 | 30 次/15分钟/IP |
| 职业规划 | 20 次/分钟/IP |
| 技能树对话 | 30 次/分钟/IP |
| 技能树操作 | 60 次/分钟/IP |

## 6. 反馈收集

### 6.1 内测用户反馈渠道
- 微信群/钉钉群
- GitHub Issues
- 邮件反馈

### 6.2 需要收集的信息
- 功能是否正常
- 响应速度是否可接受
- 是否遇到错误
- 改进建议

## 7. 回滚方案

详见 [docs/ROLLBACK_GUIDE.md](ROLLBACK_GUIDE.md)

### 7.1 快速回滚

```bash
git log --oneline
git reset --hard <commit-hash>
npm install
pm2 restart skillmap
```

### 7.2 数据库回滚
- SQLite: 恢复备份文件
- PostgreSQL: 从备份恢复

## 8. 内测检查清单

### 8.1 上线前
- [ ] 环境变量配置正确
- [ ] 数据库初始化成功
- [ ] LLM API Key 有效
- [ ] 健康检查接口正常
- [ ] 监控数据正常采集

### 8.2 内测中
- [ ] 每天检查错误率
- [ ] 每天检查 LLM 调用统计
- [ ] 收集用户反馈
- [ ] 记录发现的问题

### 8.3 内测结束
- [ ] 汇总用户反馈
- [ ] 修复发现的问题
- [ ] 评估是否需要切换到 PostgreSQL
- [ ] 准备正式上线
