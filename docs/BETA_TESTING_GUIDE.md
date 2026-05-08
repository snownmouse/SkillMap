# SkillMap 内测指南

本文档针对当前仓库的真实状态编写，目标不是描述理想架构，而是帮助你在现阶段完成一轮可执行的内测。

## 1. 当前建议的内测范围

优先测试以下主链路：

- 技能树生成
- 节点对话与进度更新
- 职业规划
- 健康检查与基础接口可达性
- WebSocket 建连与任务订阅

当前不建议把“所有扩展接口都可用”作为内测前提，因为仓库中仍存在部分扩展服务和旧接口封装未完全接入主流程。

## 2. 推荐内测环境

### 2.1 本地或小规模内测

- 数据库：SQLite
- 模型：Ark、DeepSeek、SiliconFlow 或 Dummy
- 启动方式：`npm run dev`

推荐原因：

- 配置简单
- 当前代码对 SQLite 的本地主链更容易跑通
- 出问题时更容易定位

### 2.2 较高并发内测

- 数据库：PostgreSQL
- 模型：任选稳定供应商
- 前提：先做完整接口联调，不要直接切生产流量

## 3. 最小配置

### 3.1 用真实模型测试

```bash
PORT=3000
LLM_PROVIDER=ark
ARK_API_KEY=your-key
```

### 3.2 只验证产品链路

```bash
PORT=3000
LLM_PROVIDER=dummy
```

### 3.3 PostgreSQL 测试

```bash
PORT=3000
LLM_PROVIDER=ark
ARK_API_KEY=your-key
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=skillmap
DB_USER=postgres
DB_PASSWORD=your-password
DB_MAX_CONNECTIONS=20
```

## 4. 建议的测试顺序

### 4.1 启动验证

```bash
npm install
npm run lint
npm run dev
```

验证：

- 首页是否可访问
- `/api/health` 是否返回 200
- `/api/metrics` 是否返回系统指标
- 服务端日志是否有数据库初始化错误

### 4.2 职业规划

验证目标：

- `POST /api/careers/plan` 能返回结构化路径
- 缺少必要参数时能返回 400 错误

### 4.3 技能树生成

验证目标：

- 能成功创建任务 (`POST /api/trees/generate`)
- 能轮询或查询任务状态 (`GET /api/trees/task/:taskId`，兼容 `GET /api/tasks/:taskId`)
- 能取消任务 (`POST /api/tasks/:taskId/cancel`)
- 最终能拿到树数据 (`GET /api/trees/:id`)

### 4.4 节点对话

验证目标：

- 指定节点发送消息后，能返回 AI 回复 (`POST /api/trees/:treeId/chat`)
- 进度更新能回写到树数据
- 历史消息可读取 (`GET /api/trees/:treeId/chat/:nodeId`)

### 4.5 WebSocket

验证目标：

- 能连接 `/ws`
- 发送认证消息后连接不报错
- 订阅任务消息时客户端不崩溃

## 5. 当前主要风险

### 5.1 数据库模式差异

当前仓库支持 SQLite/PostgreSQL 双模式，并在启动时自动执行版本化迁移；但仍建议 PostgreSQL 内测前覆盖认证、监控、WebSocket、对话和生成链路的完整联调与压测，而不是只看数据库能否连通。

### 5.2 扩展接口未完全闭环

前端和后端中还保留了一些未来能力或旧接口封装，例如：

- 部分扩展 API
- 部分服务层能力
- 未完全接入主路由的页面

内测时建议聚焦当前主链路，不要默认所有页面和所有接口都已可用。

### 5.3 模型供应商风险

建议准备至少两个 Provider：

- 主 Provider：`ark` 或你当前最稳定的供应商
- 备用 Provider：`deepseek`、`siliconflow` 或 `dummy`

## 6. 建议记录的反馈

- 生成耗时
- 对话质量
- 进度更新是否合理
- 页面是否白屏或卡死
- 是否出现 401、500、数据库报错或 WebSocket 断连

## 7. 每日检查项

- [ ] `/api/health` 正常
- [ ] 至少一次技能树生成成功
- [ ] 至少一次节点对话成功
- [ ] 服务端日志没有连续报错
- [ ] 当前 `.env` 没被误改

## 8. 出问题时怎么处理

- 模型失败：优先切换 `LLM_PROVIDER`
- 页面白屏：优先检查最近前端改动与 `dist`
- 接口 500：先看数据库模式和日志
- SQLite 写入异常：考虑切 PostgreSQL

详见 `docs/ROLLBACK_GUIDE.md`。
