# SkillMap 安全指南

## 1. 安全架构

SkillMap 实现了多层安全防护，包括 API 安全、WebSocket 安全、数据安全等。

## 2. 安全中间件

### 2.1 安全中间件 (security.ts)

```typescript
// 速率限制
rateLimit: {
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 100  // 最多 100 请求/窗口
}

// 输入清理
sanitizeInput: 清理用户输入中的恶意内容

// 安全响应头
securityHeaders: 配置 CSP, X-Frame-Options, X-Content-Type-Options 等
```

### 2.2 请求追踪 (requestTracer.ts)

- 为每个请求生成唯一追踪 ID
- 记录请求日志便于审计

### 2.3 LLM 速率限制 (llmRateLimit.ts)

- 限制 LLM API 调用频率
- 防止 API 配额耗尽

## 3. 认证与授权

### 3.1 Token / Session

系统使用随机 token（`Authorization: Bearer <token>`）与 refreshToken 组合实现会话管理，并在数据库 `sessions` 表中校验有效期。

### 3.2 密码安全

- 当前实现使用 SHA-256 对密码做哈希后入库（`users.password_hash`）
- 建议密码长度 >= 8 位，并开启复杂度校验
- 生产环境建议将密码哈希升级为 bcrypt/argon2，并做渐进式迁移

## 4. API 安全

### 4.1 公开 API

| 端点 | 说明 |
|------|------|
| `GET /api/health` | 健康检查 |
| `POST /api/auth/register` | 用户注册 |
| `POST /api/auth/login` | 用户登录 |

### 4.2 需要认证的 API

部分 API 需要通过 token 认证：

```
Authorization: Bearer token
```

## 5. 数据安全

### 5.1 SQLite 数据库

- 数据库文件存储在 `data/` 目录
- 建议对敏感数据进行加密存储
- 定期备份数据库

### 5.2 PostgreSQL 数据库

- 使用强密码
- 配置合理的连接权限
- 启用 SSL 连接（生产环境）

## 6. LLM 安全

### 6.1 输入验证

- 对用户输入进行清理和验证
- 防止 Prompt Injection 攻击

### 6.2 输出过滤

- 对 LLM 返回内容进行安全过滤
- 防止敏感信息泄露

### 6.3 速率控制

- 配置 LLM 调用频率限制
- 防止 API 配额滥用

## 7. WebSocket 安全

### 7.1 连接认证

```javascript
// 连接时需要认证
ws.send(JSON.stringify({
  type: 'auth',
  token: 'token'
}));
```

### 7.2 消息验证

- 验证消息格式和内容
- 防止恶意消息注入

## 8. 生产环境安全建议

### 8.1 环境配置

- `NODE_ENV=production`
- 启用 HTTPS
- 配置正确的 CORS 策略

### 8.2 监控告警

- 配置异常访问告警
- 监控失败登录尝试
- 记录关键操作审计日志

### 8.3 定期维护

- 定期更新依赖包
- 审查代码安全漏洞
- 备份重要数据
