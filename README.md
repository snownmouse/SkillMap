# SkillMap

SkillMap 是一个前后端一体化的 AI 学习规划项目，用来生成技能树、围绕节点进行学习复盘，并保存学习过程中的进度与对话记录。

当前仓库已经具备前端、后端、数据库、模型接入和提示词模板五大层，但仍处在持续演进阶段，部分扩展服务和文档尚未完全收敛。本文档只描述当前代码实际存在的结构与可运行方式。

## 当前能力

- 技能树生成：根据专业、目标职业、当前水平等输入生成树状学习路径
- 节点对话：围绕单个技能节点进行多轮复盘，并回写学习进度
- 职业规划：根据专业与目标职业生成多条成长路径
- 认证接口：支持注册、登录、刷新令牌、登出、改密
- 实时通道：提供 WebSocket 连接与任务订阅消息
- 双数据库模式：默认 SQLite，可切换 PostgreSQL

## 技术栈

- 前端：React 19、TypeScript、Vite、Tailwind CSS v4、Cytoscape、Motion
- 后端：Node.js、Express、TypeScript
- 数据库：better-sqlite3、PostgreSQL
- 模型：Gemini、DeepSeek、SiliconFlow、Qwen、Ark、自定义 OpenAI 兼容接口、Dummy Provider

## 项目结构

```text
.
├── server.ts                 # 服务端入口，开发时承载 Vite 中间件
├── worker.ts                 # 后台工作进程入口
├── src/
│   ├── components/           # 前端组件
│   │   ├── Assessment/       # 职业测评组件
│   │   ├── Chat/             # 对话组件
│   │   ├── Debug/            # 调试面板
│   │   ├── Generate/         # 生成表单与动画
│   │   ├── Layout/           # 布局与导航
│   │   ├── SkillTree/        # 技能树可视化
│   │   └── Timeline/         # 时间线组件
│   ├── context/              # 全局状态 (AppContext)
│   ├── hooks/                # 前端 hooks，包括 WebSocket / 语音
│   ├── pages/                # 页面入口
│   ├── server/               # 后端业务
│   │   ├── controllers/      # 控制器
│   │   ├── database/         # SQL 构建器
│   │   ├── llmProviders/     # 模型适配层
│   │   ├── middleware/       # 安全、限流、监控、追踪
│   │   ├── migrations/       # 数据库版本迁移
│   │   ├── prompts/          # 提示词模板
│   │   ├── repositories/     # 数据访问层
│   │   ├── routes/           # API 路由
│   │   ├── services/         # 业务服务
│   │   └── utils/            # 后端工具函数
│   ├── services/             # 前端 API 封装
│   ├── types/                # 类型定义
│   └── utils/                # 通用工具
├── scripts/
│   ├── db/                   # 数据库迁移脚本
│   └── style/                # 样式替换工具脚本
├── docs/                     # 项目文档（按类别组织）
│   ├── architecture/         # 架构与设计文档
│   ├── setup/                # 安装配置文档
│   ├── api/                  # API 与接口文档
│   ├── operations/           # 运维与安全文档
│   ├── CONTRIBUTING.md       # 贡献指南
│   └── README.md             # 文档导航
└── tests/                    # 测试脚本
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

#### 国内云服务器部署提示

部分国内云服务器（如腾讯云、阿里云）出网到 `github.com` / npm 官方源不稳定，可能导致 `git clone` 或 `npm install` 超时。可按需切换镜像：

```bash
# Git 镜像（如 gitclone.com）
git clone https://gitclone.com/github.com/<user>/<repo>.git

# npm 镜像（如腾讯云内网镜像，仅对腾讯云实例生效）
npm config set registry https://mirrors.cloud.tencent.com/npm/
# 或通用国内镜像
npm config set registry https://registry.npmmirror.com/
```

仓库根目录已附带 `.npmrc`，默认仅显式开启 `optional=true`（确保 `@tailwindcss/oxide-*` 等平台相关 optional 依赖被安装）；如需切换 registry，可在该文件中取消对应行的注释，或在安装前用 `npm config set registry ...` 临时切换。

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，至少配置一个可用的 LLM Provider。

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

推荐的最小配置示例：

```bash
PORT=3000
LLM_PROVIDER=ark
ARK_API_KEY=your-key
```

如果只是调试前后端链路，不接真实模型，也可以用：

```bash
LLM_PROVIDER=dummy
```

### 3. 启动开发环境

```bash
npm run dev
```

启动成功后会看到：

- HTTP 服务：`http://localhost:3000`
- WebSocket：`ws://localhost:3000/ws`

开发模式下由 `server.ts` 启动 Express，并在同一进程中挂载 Vite 中间件。

### 4. 常用命令

```bash
npm run dev
npm run lint
npm test
npm run build
npm run clean
npm run db:migrate
npm run db:status
```

### 5. Docker 一键启动（生产形态）

仓库提供 `docker-compose.yml`，会启动 Postgres + Redis + 应用服务：

```bash
docker compose up --build
```

## 数据库模式

### SQLite

- 默认模式
- 适合本地开发和单机测试
- 只需要设置 `DB_PATH`，默认值为 `./data/skillmap.db`

### PostgreSQL

- `NODE_ENV=staging|production` 且显式配置了 `DB_HOST` 时启用
- 其他环境下：设置 `DB_HOST` 为非空且非 `localhost` 时启用
- 未配置 `DB_HOST` 时回落到 SQLite，方便低配单机部署
- 适合生产环境和高并发写入场景
- 需要同时配置 `DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`

数据库迁移在启动时自动执行（schema_migrations 版本表），也可以手动运行迁移命令（见上面的 `db:*` scripts）。

## 当前路由概览

后端入口在 `server.ts`，当前挂载的主要路由包括：

- `/api/auth`
- `/api/careers`
- `/api/goals`
- `/api/trees`
- `/api/trees/:treeId/chat`
- `/api/tasks/:taskId`
- `/api/health`
- `/api/metrics`

说明：
- `/api/debug` 仅在非 production 环境挂载
- 任务状态也支持 `GET /api/trees/task/:taskId`（前端轮询使用）

前端当前主路由包括：

- `/`
- `/generate`
- `/tree`
- `/tree/timeline`

## 文档

完整文档导航见 [docs/README.md](docs/README.md)，主要文档包括：

- [技术架构文档](docs/architecture/ARCHITECTURE.md)：系统架构、前后端结构、数据模型
- [构建与部署指南](docs/setup/BUILD_GUIDE.md)：开发/生产环境构建与部署
- [环境配置指南](docs/setup/ENVIRONMENT_GUIDE.md)：环境变量与 LLM 供应商配置
- [数据库迁移指南](docs/setup/DATABASE_MIGRATION_GUIDE.md)：SQLite 与 PostgreSQL 切换
- [API 文档](docs/api/API_GUIDE.md)：RESTful API 接口说明
- [WebSocket 指南](docs/api/WEBSOCKET_GUIDE.md)：WebSocket 连接与消息协议
- [安全指南](docs/operations/SECURITY.md)：安全架构与防护机制
- [回滚指南](docs/operations/ROLLBACK_GUIDE.md)：回滚预案与验证步骤
- [内测指南](docs/setup/BETA_TESTING_GUIDE.md)：当前版本的测试建议

## 已知现状

- 仓库仍保留部分扩展服务与旧接口封装，尚未全部接入主流程
- 文档已按当前代码结构重整，但高级功能不代表全部已在线上闭环
- 生产构建在当前 Windows 环境下可能出现收尾阶段异常退出，但 `dist` 产物可生成，建议结合实际部署环境继续验证

## 建议维护方向

- 统一数据库访问抽象，不再混用 `prepare()` 和 `query()`
- 收敛前端 API 层，统一 `apiClient` 与旧服务封装
- 将提示词版本管理与实际业务调用打通
- 为 WebSocket、任务状态和认证流补齐端到端文档
