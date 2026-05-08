# SkillMap 下一步修改与调整建议（内网多用户 → 公网多用户）

本文档用于把当前仓库的架构风险与下一步改造方向一次性列清楚，并按“关键程度/影响面”排序，作为后续迭代的主导航。

当前进度（与本仓库保持同步）：

- 身份根基：已从 `x-device-id` 迁移到服务端签发的访客会话（HttpOnly Cookie + DB 映射）
- 安全基线：CORS 生产强制白名单；WS Origin 校验 + 订阅归属校验 + 基础限流
- PostgreSQL 兼容：移除 `gen_random_uuid()` 依赖，避免扩展缺失导致运行时报错
- 可靠性：任务状态落库；Redis PubSub 跨实例推送；Redis Stream 队列 + worker；任务租约与自动重试；支持手动重试

目标部署路径：

- 第一阶段：内网多用户可用（可控网络、可控用户，但仍需严肃的权限与安全边界）
- 第二阶段：公网多用户可用（面对不可信网络与不可信用户，必须满足安全与稳定性基线）

数据库策略（明确结论）：

- 内网多用户与公网多用户均以 PostgreSQL 为基线；SQLite 仅用于本地开发/轻量调试。
- 当前仓库仍保留 SQLite 兼容路径，但存在多处“语义不等价/实现缺口”，不适合作为多用户环境的稳定底座。

---

## 1. 架构现状（用于理解风险分布）

### 1.1 单进程一体化（Express + Vite + WS）

- 开发模式：`server.ts` 启动 Express，并在同进程挂载 Vite middleware
- 生产模式：同一进程提供静态资源（可选 SSR），同时提供 `/api/**` 与 `/ws`

对应关键文件：

- 服务入口：`server.ts`
- Express 组装与路由挂载：`src/server/app.ts`
- WebSocket 服务：`src/server/websocket.ts`
- 数据库初始化与方言分支：`src/server/database.ts`

### 1.2 关键数据流（影响最大）

- 技能树生成：`POST /api/trees/generate` → 创建 task（落库）→（可选）入队 → worker 执行 LLM 生成 → 写入 DB → WS 推送进度 → 前端轮询/订阅展示
- 节点对话：`POST /api/trees/:treeId/chat` → 读取上下文/写入消息 → 回写进度/能力 → 返回回复
- 身份模型：HTTP 支持“登录用户 Bearer token”与“访客 Cookie 会话”；WS 默认用 Cookie 会话，亦支持显式 `auth` 消息（Bearer token）
- 多实例推送：WS 的 task_update 支持 Redis PubSub 跨实例广播；任务执行通过 Redis Stream 队列分发（可与 API 进程解耦）

---

## 2. 风险总表（按紧要程度排序）

标记规则：

- P0：阻断型/高危型（内网多用户也必须先修）
- P1：上线前必须修（公网前必须修；内网可评估延期但建议尽早）
- P2：质量/可维护性（不修不一定马上出事，但会持续拖慢迭代或积累隐患）

---

## 3. P0（内网多用户也必须先修）

### P0-1 访客身份可被冒用（权限根基不稳）

现状：

- 无 token 时使用 `x-device-id` 直接拼接成 `device_${deviceId}` 作为用户 ID（HTTP 与 WS 都依赖）
- 任何能拿到/猜到别人 deviceId 的人都可能冒用其“访客账号”访问其资源

涉及位置：

- `src/server/controllers/authController.ts`（`optionalAuth`）
- `src/services/apiClient.ts`（默认发送 `x-device-id`）

建议改造方向：

- 内网阶段起即停止“信任客户端 deviceId 作为身份”的做法
- 用服务端签发的“访客会话”（短期 token 或一次性票据）替代
- 若仍需 deviceId：必须服务端生成并固化（HttpOnly Cookie 或签名绑定），避免可伪造

验收标准：

- 仅凭修改 header 不能切换到其他用户的数据视图
- HTTP 与 WS 的用户身份一致且不可被伪造

当前实现状态：

- 已完成：服务端签发 `sm_guest` HttpOnly Cookie；在 DB `guest_sessions` 中映射到 `guest_<uuid>` 用户 ID；前端默认不再依赖 `x-device-id`

### P0-2 CORS 默认 `*` 且 `credentials: true`

现状：

- `src/server/app.ts` 中 `origin: process.env.CORS_ORIGIN || '*'` 且 `credentials: true`

风险：

- 浏览器侧跨站访问策略不清晰；在多用户场景会放大被滥用/误配风险

建议改造方向：

- 内网阶段：明确白名单域（例如内网域名/固定 IP 段对应的前端域）
- 公网阶段：严格按环境区分（生产必须白名单），并审视是否需要 `credentials`

验收标准：

- 生产环境不允许 `*` 作为 CORS origin
- 仅允许受信任前端域名访问携带凭证的 API

当前实现状态：

- 已完成：production/staging 必须显式配置 `CORS_ORIGIN` 白名单（逗号分隔）；当允许 `*` 时自动禁用 credentials

### P0-3 WebSocket 认证与隔离不足（token 泄露与跨站连接风险）

现状：

- WS 允许通过 URL query 携带 token（易进入代理/访问日志）
- 服务端未对 `Origin` 做白名单校验（浏览器 WS 不受 CORS 保护）
- 订阅 task 目前缺少“task 归属校验”（设计脆弱，容易引入数据泄露）

涉及位置：

- `src/server/websocket.ts`
- `src/hooks/useWebSocket.ts` / `src/hooks/useTaskWebSocket.ts`

建议改造方向：

- token 不走 URL：改走 `Sec-WebSocket-Protocol` 或先换取一次性 ticket 再升级 WS
- 连接时校验 `Origin`（白名单）
- `subscribe_task` 必须校验 task 属于当前连接用户（以 DB/持久层或 server 内存 task 绑定为准）
- 增加 WS 级别速率限制（连接数、消息频率、订阅频率）

验收标准：

- WS 访问日志不包含敏感 token
- 非白名单来源页面无法建立 WS
- 任意 taskId 不能被不相关用户订阅到更新

当前实现状态：

- 已完成：WS Origin 白名单校验；订阅 task 时校验 tasks.user_id；连接数/消息频率基础限流
- 已完成：WS 默认不再通过 URL query 传递 token（改为 Cookie 会话）；如需登录态可发送 `auth` 消息（Bearer）

### P0-4 生产敏感信息泄露（日志/调试接口）

现状：

- 生成树过程中存在直接打印用户输入/任务输入的日志（可能包含隐私与敏感内容）
- `/api/debug` 虽仅在非 production 挂载，但如果环境变量误配仍可能暴露 LLM 日志/数据库记录

涉及位置：

- `src/server/controllers/treeController.ts`（console 输出 inputs/task.inputs）
- `src/server/routes/debug.ts`、`src/server/app.ts`（debug 路由挂载条件）

建议改造方向：

- 禁止在生产打印请求体/用户输入；统一使用结构化日志并做字段级脱敏（token、password、message 等）
- debug 路由增加显式开关（例如 `ENABLE_DEBUG_ROUTES=false` 默认关闭），并要求强认证

验收标准：

- 生产日志不包含用户原始输入与 token
- debug 路由在任何生产配置下默认不可访问

当前实现状态：

- 已完成：移除生成链路中的明文 `console.log(inputs)`；debug 路由仅在 `ENABLE_DEBUG_ROUTES=true` 且非 production 才挂载，并要求登录

### P0-5 PostgreSQL “必需扩展/SQL 方言”不一致（会导致部分服务运行时报错）

现状：

- 代码中存在 `gen_random_uuid()::text`（依赖 `pgcrypto`），但初始化里创建的是 `"uuid-ossp"`
- 相关 SQL 在 PostgreSQL 环境下可能直接报错，造成告警/质量评估等功能不可用或反复失败

涉及位置：

- `src/server/services/AlertService.ts`
- `src/server/services/QualityAssessmentService.ts`
- `src/server/database/sqlBuilder.ts`

建议改造方向：

- 统一 UUID 生成策略：
  - 要么统一使用 `uuid_generate_v4()` 并启用 `uuid-ossp`
  - 要么统一使用 `gen_random_uuid()` 并启用 `pgcrypto`
- 把“方言差异”集中到 `sqlBuilder`，禁止在业务 SQL 中散落不同写法

验收标准：

- 在 PostgreSQL 空库联调时上述服务不再报 “function does not exist”
- 迁移/初始化脚本确保必需扩展存在

当前实现状态：

- 已完成：相关服务使用应用层 UUID（不再依赖 `gen_random_uuid()`）

---

## 4. P1（公网前必须修；内网建议尽早修）

### P1-1 密码与会话安全（抗撞库与库泄露能力不足）

现状：

- 密码使用 SHA-256（无盐）哈希；token/refreshToken 明文存储

涉及位置：

- `src/server/controllers/authController.ts`

建议改造方向：

- 密码哈希升级为 bcrypt/argon2（带盐与成本因子），支持渐进式迁移
- token 存储改为只存哈希（例如 `sha256(token)`），降低数据库泄露后的会话接管风险
- 增加登录失败计数与冻结策略（防暴力破解）

当前实现状态：

- 已完成：密码哈希升级为 bcrypt（旧 sha256 用户可渐进升级）；session token/refreshToken 存储改为 `h1:sha256(rawToken)` 并兼容旧值
- 待完善：按账号维度的冻结/验证码策略、关键行为审计日志与告警策略

### P1-2 限流与资源保护（避免 LLM/WS 被刷爆）

现状：

- HTTP 限流仅在 production 分支对部分路由启用；dev/内网环境基本不保护
- 限流 store 为进程内 Map，不支持多实例且可能被大量 key 撑爆内存
- WS 没有任何速率限制

涉及位置：

- `src/server/middleware/security.ts`
- `src/server/app.ts`
- `src/server/websocket.ts`

建议改造方向：

- 内网阶段起对高成本接口（LLM 生成/对话/导入）启用基础限流
- 公网阶段将限流迁移到 Redis store 或网关层（Nginx/API Gateway），并限制 WS 消息频率/连接数

当前实现状态：

- 已完成：HTTP 限流支持 Redis store（未配置 Redis 自动降级内存）；WS 已加基础限流（消息/连接）
- 待完善：公网场景建议把基础限流迁移到反代/网关层并统一策略（按用户/租户/来源分级）

### P1-3 任务系统可靠性（重启/多实例/排队）

现状：

- 生成任务状态主要在进程内 Map；服务重启会丢状态
- 多实例部署无法跨实例推送 WS 更新，轮询也可能查不到任务

涉及位置：

- `src/server/controllers/treeController.ts`
- `src/server/websocket.ts`

建议改造方向：

- 内网阶段至少：任务状态落库（复用现有 `tasks` 表），`GET /api/tasks/:id` 从 DB 读取
- 公网阶段：引入队列与 worker（或 Redis stream/BullMQ），并用 Redis PubSub 推送 WS 更新

当前实现状态：

- 已完成：任务状态落库（含 user_id 与 inputs）；重启时可将过期任务标记失败；支持 `POST /api/tasks/:id/retry`
- 已完成：Redis PubSub 跨实例转发 task_update；Redis Stream 队列 + consumer group worker；DB 租约防重复执行；指数退避自动重试 + 调度器
- 已完成：支持独立 worker 进程（`npm run worker`）与 docker-compose 分离 app/worker

### P1-4 权限模型收敛（避免“读能读/写不能写”的边界混乱）

现状：

- 部分读接口与写接口对 allowed user_ids 的处理不一致
- 存在 “legacy default user” 兼容逻辑，容易造成跨用户数据暴露

涉及位置：

- `src/server/utils/auth.ts`
- `src/server/controllers/goalController.ts`
- `src/server/controllers/treeController.ts`

建议改造方向：

- 移除运行时 default-user 兼容，改为一次性数据迁移
- 将“资源归属校验”统一封装到 repository/service，所有读写走同一策略

### P1-5 输入校验与 DoS 防护（大对象/深对象/递归清洗）

现状：

- 部分端点接收复杂 JSON，主要依赖通用清洗与局部校验，缺少结构级约束
- 递归清洗对超深/超大对象存在性能风险

涉及位置：

- `src/server/middleware/validation.ts`
- `src/server/middleware/security.ts`
- `src/server/controllers/treeController.ts`（import/update 等）

建议改造方向：

- 引入 schema 校验（限制最大深度、节点数、字符串长度、数组大小）
- 对导入/更新类接口设置更严格 body 限制与超限快速失败

---

## 5. P2（质量与可维护性：持续收益）

### P2-1 “提示词 → 后端保存/返回 → 前端类型/渲染”一致性（避免成品漂移）

现状：

- 提示词要求的结构可能比后端保存/前端类型与渲染更丰富，存在“输出被裁剪/漂移”

建议改造方向：

- 为生成结果定义稳定 schema（版本化）
- 对生成结果做契约测试：prompt 输出 → validate → API response → UI 渲染快照

### P2-2 观测与告警基线（定位问题成本过高）

建议改造方向：

- 统一结构化日志（请求 id、user id、tree id、task id、latency、错误码）
- metrics/health 对公网环境做鉴权或仅内网暴露
- 对 LLM 调用建立可追踪 request_id 与采样策略（避免泄露敏感文本）

### P2-3 代码组织与重复逻辑收敛

建议改造方向：

- 把 auth 相关“可访问 user_id 计算”统一放在一个模块，避免 controller 内复制逻辑
- 把 DB 方言差异集中在 `sqlBuilder`，业务层禁止出现方言分支

---

## 6. 分阶段推进建议（内网多用户 → 公网多用户）

### 6.1 内网多用户（建议达到的“可用基线”）

- 身份：停止信任 `x-device-id` 作为身份，至少改为服务端签发的会话
- 安全：CORS 白名单；WS token 不进 URL；WS Origin 校验；基础限流（LLM/导入/对话）
- 数据库：PostgreSQL 全链路联调通过；统一 UUID/扩展策略；迁移可重复执行
- 稳定性：任务状态落库（最小化实现），重启后前端能看到明确状态
- 日志：生产不记录明文输入，debug 路由默认关闭

### 6.2 公网多用户（必须补齐的“上线基线”）

- 账户安全：bcrypt/argon2；token 哈希化；登录失败防爆破；必要的审计日志
- 资源保护：Redis 限流 store/网关限流；WS 连接数/消息频率控制；LLM 配额隔离（按用户/租户）
- 可靠性：任务队列 + worker；多实例 WS 广播（Redis PubSub）；滚动发布不丢任务
- 运维：TLS/反代配置、数据库备份与恢复演练、回滚预案可执行、监控告警闭环

---

## 8. 推荐的运行形态（内网 → 公网）

建议尽早将“API 进程”和“Worker 进程”分离，避免一个进程既承载请求峰值又承载长耗时任务：

- API：提供 HTTP + WS，对外暴露端口
- Worker：消费 Redis Stream 队列，执行生成任务与重试调度

关键环境变量（摘要）：

- `REDIS_URL`：启用 Redis store（限流、PubSub、队列）
- `TASK_QUEUE_MODE=redis`：强制启用 Redis 队列（未设置时会根据是否有 REDIS_URL 自动选择）
- `DISABLE_TASK_WORKER=true`：在 API 进程禁用 worker（推荐）
- `DISABLE_TASK_SCHEDULER=true`：禁用自动重试调度（一般不建议）
- `TASK_MAX_ATTEMPTS` / `TASK_LEASE_MS` / `TASK_STALE_MINUTES`：重试/租约/过期任务策略

---

## 7. 建议的验收方式（让“信心”变成可验证的事实）

为避免“感觉差不多”，建议把关键风险转成可重复验证的检查项：

- 数据库：同一套集成测试在 PostgreSQL 上稳定通过（生成树/聊天/导入/更新/删除/任务查询）
- 权限：随机篡改身份字段（headers、ws auth）无法访问他人资源（自动化测试 + 手动演练）
- WS：非白名单 Origin 建连失败；task 订阅必须通过归属校验
- 重启演练：生成任务进行中重启服务，任务状态可恢复/或明确失败并可重试
- 日志检查：生产日志抽样验证不包含用户输入原文与 token
