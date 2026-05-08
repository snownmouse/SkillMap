# SkillMap 技术架构文档

## 1. 技术栈

### 1.1 前端技术
- **框架**: React 19, TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS v4
- **图谱渲染**: Cytoscape.js
- **动画**: Motion
- **路由**: React Router v7
- **状态管理**: React Context API

### 1.2 后端技术
- **语言**: Node.js, TypeScript
- **框架**: Express
- **数据库**: SQLite (better-sqlite3), PostgreSQL (pg)
- **AI 集成**: 多提供商支持 (Ark, SiliconFlow, DeepSeek 等)
- **WebSocket**: ws 库
- **环境管理**: dotenv

### 1.3 工具链
- **代码检查**: TypeScript compiler
- **开发工具**: tsx (用于运行 TypeScript 服务器)

## 2. 系统架构

### 2.1 架构概览
SkillMap 采用前后端同仓的一体化架构：开发环境由 `server.ts` 启动 Express 并挂载 Vite 中间件；生产环境默认提供静态资源服务，并可通过环境变量开关启用 SSR。

### 2.2 核心流程

#### 技能树生成流程
```
用户输入 -> 创建任务 -> AI 生成 -> 轮询状态 -> 获取结果
```

#### 对话流程
```
用户发送消息 -> 获取上下文 -> AI 处理 -> 更新进度 -> 返回响应
```

## 3. 前端架构

### 3.1 目录结构
```
src/
├── components/        # 可复用组件
│   ├── Chat/          # 对话相关组件
│   ├── Debug/         # 调试相关组件
│   ├── Generate/      # 生成相关组件
│   ├── Layout/        # 布局组件
│   ├── SkillTree/     # 技能树相关组件
│   └── Timeline/      # 时间线组件
├── context/           # React 上下文
├── hooks/             # 自定义 Hooks
│   ├── useChat.ts          # 对话相关逻辑
│   ├── useLocalStorage.ts  # 本地存储
│   ├── useSkillTree.ts     # 技能树相关逻辑
│   ├── useVoiceInput.ts   # 语音识别（STT）
│   ├── useVoiceOutput.ts  # 语音合成（TTS）
│   └── useWebSocket.ts    # WebSocket 连接
├── pages/             # 页面组件
├── server/            # 后端代码（SSR）
├── services/          # 前端服务层
│   ├── difyApi.ts    # Dify API 服务
│   └── storage.ts    # 本地存储服务
├── types/             # TypeScript 类型定义
├── utils/             # 工具函数
├── App.tsx            # 应用入口
├── config.ts          # 前端配置
├── index.css          # 全局样式
└── main.tsx          # 主入口
```

### 3.2 核心组件

#### AppLayout
- **功能**: 应用的主布局组件
- **位置**: `src/components/Layout/AppLayout.tsx`
- **职责**: 提供导航栏、侧边栏和主内容区域

#### SkillTreeCanvas
- **功能**: 技能树的可视化渲染
- **位置**: `src/components/SkillTree/SkillTreeCanvas.tsx`
- **职责**: 使用 Cytoscape.js 渲染技能树，处理节点交互

#### ChatPanel
- **功能**: 对话面板组件
- **位置**: `src/components/Chat/ChatPanel.tsx`
- **职责**: 显示对话历史，处理用户输入，展示 AI 回复

#### GenerateForm
- **功能**: 技能树生成表单
- **位置**: `src/components/Generate/GenerateForm.tsx`
- **职责**: 收集用户输入，提交生成请求

### 3.3 状态管理
使用 React Context API 进行状态管理：
- **AppContext**: 管理应用级状态，如用户信息、当前技能树等
- **位置**: `src/context/AppContext.tsx`

### 3.4 自定义 Hooks
- **useChat**: 处理对话相关逻辑
- **useSkillTree**: 处理技能树相关逻辑
- **useLocalStorage**: 处理本地存储
- **useVoiceInput**: 处理语音识别（Speech-to-Text）
- **useVoiceOutput**: 处理语音合成（Text-to-Speech）
- **useWebSocket**: 处理 WebSocket 连接，支持实时通信

## 4. 后端架构

### 4.1 目录结构
```
src/server/
├── controllers/       # 控制器
│   ├── authController.ts    # 认证相关
│   ├── careerController.ts  # 职业规划相关
│   ├── chatController.ts    # 对话相关
│   ├── goalController.ts    # 目标/成长计划相关
│   └── treeController.ts    # 技能树相关
├── middleware/         # 中间件
│   ├── security.ts        # 安全相关（rateLimit, sanitizeInput, securityHeaders）
│   ├── requestTracer.ts   # 请求追踪
│   ├── metrics.ts        # 指标收集中间件
│   └── llmRateLimit.ts   # LLM 速率限制
├── prompts/           # 提示词模板
│   ├── careerPlan.ts       # 职业规划提示词
│   ├── chatSummary.ts      # 对话总结提示词
│   ├── checkinChat.ts      # 对话提示词
│   ├── generateTree.ts     # 技能树生成提示词
│   └── learningSuggestion.ts # 学习建议提示词
├── repositories/      # 数据访问层
│   ├── AbilityRepository.ts     # 能力数据仓库
│   ├── ChatMessageRepository.ts # 对话消息数据仓库
│   ├── SkillTermRepository.ts  # 技能术语仓库
│   └── TreeRepository.ts        # 技能树数据仓库
├── routes/            # API 路由
│   ├── auth.ts        # 认证路由
│   ├── career.ts      # 职业规划路由
│   ├── chat.ts        # 对话路由
│   ├── debug.ts       # 调试路由
│   ├── goals.ts       # 目标/成长计划路由
│   └── tree.ts        # 技能树路由
├── services/          # 业务逻辑层
│   ├── AbilityService.ts       # 能力服务
│   ├── AchievementService.ts   # 成就服务
│   ├── AlertService.ts        # 告警服务
│   ├── BackupService.ts       # 备份服务
│   ├── CacheService.ts        # 缓存服务
│   ├── ChatMessageService.ts   # 对话消息服务
│   ├── LearningPlanService.ts  # 学习计划服务
│   ├── MetricsService.ts     # 指标服务
│   ├── ProgressService.ts      # 进度服务
│   ├── QualityAssessmentService.ts # 质量评估服务
│   ├── TimelineService.ts      # 时间线服务
│   └── TreeVersionService.ts   # 技能树版本服务
├── utils/             # 工具函数
│   ├── JsonRepairUtils.ts # JSON 修复工具
│   ├── Logger.ts       # 日志工具
│   ├── jsonParser.ts  # JSON 解析工具
│   └── logger.ts      # 日志工具(兼容)
├── llmProviders/     # LLM 提供商
│   ├── base.ts       # 基础接口
│   ├── providers.ts   # 提供商管理
│   ├── dummy.ts      # 模拟提供商
│   └── gemini.ts     # Gemini 提供商
├── config.ts          # 后端配置
├── database.ts        # 数据库连接
├── llmService.ts      # LLM 服务
└── websocket.ts       # WebSocket 服务
```

### 4.2 核心模块

#### 控制器
- **authController**: 处理用户认证相关逻辑
- **chatController**: 处理对话相关逻辑
- **treeController**: 处理技能树生成和管理
- **careerController**: 处理职业规划相关逻辑

#### 服务层
- **AbilityService**: 能力相关业务逻辑
- **AchievementService**: 成就相关业务逻辑
- **AlertService**: 告警服务，监控异常
- **BackupService**: 备份服务，支持 PostgreSQL
- **CacheService**: 缓存服务
- **ChatMessageService**: 对话消息业务逻辑
- **LearningPlanService**: 学习计划业务逻辑
- **MetricsService**: 系统指标收集服务
- **ProgressService**: 学习进度业务逻辑
- **QualityAssessmentService**: 技能树质量评估
- **TimelineService**: 时间线业务逻辑
- **TreeVersionService**: 技能树版本管理

#### LLM 服务
- **LLMService**: 统一的 LLM 服务封装，处理多提供商切换和重试机制
- **日志记录**: 每次 LLM 调用都会记录日志到内存和数据库
- **熔断机制**: 支持主备提供商自动切换

#### WebSocket 服务
- **websocket.ts**: 支持实时双向通信，用于技能树生成进度推送、对话实时回复等

### 4.3 LLM 提供商
- **Ark (火山引擎)**: 主提供商
- **SiliconFlow (硅基流动)**: 备用提供商
- **DeepSeek**: 支持
- **Gemini**: 支持
- **Dummy**: 模拟模式，用于测试

### 4.4 数据库
支持 SQLite 和 PostgreSQL 两种模式：
- **SQLite**: 默认模式，适合本地开发
- **PostgreSQL**: 适合生产环境，支持高并发

数据库采用版本化迁移（schema_migrations），服务启动时会自动执行迁移；也可通过 `db:*` scripts 手动执行迁移/回滚。

主要数据表：
- `trees`: 技能树
- `chat_messages`: 对话消息
- `chat_sessions`: 对话会话
- `tasks`: 异步任务
- `users`: 用户
- `sessions`: 会话
- `achievements`: 成就
- `learning_plans`: 学习计划
- `tree_versions`: 技能树版本
- `llm_logs`: LLM 调用日志
- `metrics_snapshots`: 指标快照

### 4.5 API 设计

#### 认证 API
- `POST /api/auth/register`: 用户注册
- `POST /api/auth/login`: 用户登录
- `GET /api/auth/me`: 获取当前用户信息
- `POST /api/auth/refresh`: 刷新 Token
- `POST /api/auth/logout`: 登出
- `POST /api/auth/convert-temp`: 转换临时用户
- `POST /api/auth/update-password`: 更新密码

#### 技能树 API
- `POST /api/trees/generate`: 生成技能树
- `GET /api/trees/task/:taskId`: 查询任务状态
- `POST /api/tasks/:taskId/cancel`: 取消任务（兼容端点）
- `GET /api/trees/:id`: 获取技能树详情
- `GET /api/trees`: 获取所有技能树
- `POST /api/trees/import`: 导入技能树
- `POST /api/trees/:id/export`: 导出（Markdown）
- `POST /api/trees/:id/export-json`: 导出（JSON）
- `PUT /api/trees/:id`: 更新技能树
- `DELETE /api/trees/:id`: 删除技能树

#### 对话 API
- `POST /api/trees/:treeId/chat`: 与技能节点对话
- `GET /api/trees/:treeId/chat/:nodeId`: 获取对话历史

#### 职业规划 API
- `POST /api/careers/plan`: 生成职业规划

#### 目标规划 API
- `POST /api/goals/plan`: 生成成长计划（阉割/里程碑/多路径）

#### 调试 API
- `GET /api/health`: 健康检查
- `GET /api/metrics`: 系统指标
- `GET /api/debug/llm-logs`: LLM 日志
- `GET /api/debug/llm-stats`: LLM 统计

## 5. 数据模型

### 5.1 技能节点
```typescript
interface SkillNode {
  id: string;
  name: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  progress: number;
  type: 'core' | 'specialization' | 'general';
  level: string;
  steps: string[];
  tools: string[];
  pitfalls: string[];
  prerequisites: string[];
}
```

### 5.2 技能树
```typescript
interface SkillTree {
  id: string;
  career: string;
  summary: string;
  nodes: Record<string, SkillNode>;
  edges: Array<{ source: string; target: string }>;
  categories: Array<{ id: string; name: string; color: string }>;
}
```

### 5.3 对话消息
```typescript
interface ChatMessage {
  id: string;
  nodeId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
```

## 6. 安全机制

### 6.1 认证与授权
- Token 认证（Authorization: Bearer token）
- 临时用户支持
- 密码加密存储

### 6.2 API 安全
- 速率限制 (rate limiting)
- 输入清理 (sanitize input)
- 安全响应头 (security headers)
- LLM 速率限制

### 6.3 WebSocket 安全
- Token 认证
- 连接验证

## 7. 部署架构

### 7.1 开发环境
- `npm run dev`: 启动开发服务器
- SQLite 数据库
- 热重载

### 7.2 生产环境
- `npm run build`: 构建生产版本
- PostgreSQL 数据库
- PM2 进程管理
- Nginx 反向代理

也支持通过 `docker-compose.yml` 一键拉起 Postgres + Redis + 应用服务。

## 8. 监控与日志

### 8.1 指标监控
- 系统指标收集
- 自动快照
- 告警服务

### 8.2 LLM 日志
- 调用记录
- Token 统计
- 延迟监控
