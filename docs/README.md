# SkillMap - 对话驱动的技能探索地图

SkillMap 是一个基于 AI 的个性化技能规划与学习助手。它通过深度融合教育学理论（DACUM, Bloom's Taxonomy, ZPD）和心理学动机理论（SDT, Flow），为用户生成动态、可交互的技能树，并提供实时 AI 教练陪练。

## 核心特性

- **AI 驱动的技能树生成**: 输入你的专业、目标职业和当前水平，AI 为你量身定制学习路径
- **异步生成架构**: 采用任务队列 + worker + 轮询/WS 推送机制，支持长耗时 LLM 生成，告别请求超时
- **多供应商 LLM 支持**: 兼容 Ark (火山引擎)、SiliconFlow (硅基流动)、DeepSeek、通义千问等
- **教育学深度集成**: DACUM 任务分析、布鲁姆认知分类、最近发展区 (ZPD)
- **实时对话复盘**: 点击任何节点即可与 AI 导师对话，AI 会根据对话内容动态更新学习进度
- **WebSocket 实时通信**: 支持技能树生成进度推送、对话实时回复
- **语音交互**: 支持语音识别（STT）和语音合成（TTS）
- **响应式设计**: 适配不同设备尺寸
- **数据持久化**: 支持 SQLite 和 PostgreSQL

## 技术栈

- **前端**: React 19, TypeScript, Vite, Tailwind CSS v4, Cytoscape.js, Motion, React Router v7
- **后端**: Node.js, Express, TypeScript
- **数据库**: SQLite (better-sqlite3), PostgreSQL (pg)
- **缓存/队列**: Redis（未配置则限流/队列等能力自动降级）
- **AI**: 火山引擎 Ark, 硅基流动, DeepSeek 等
- **工具链**: TypeScript, Vite, tsx

## 快速开始

### 1. 环境配置

复制 `.env.example` 为 `.env` 并填写你的 API Key：

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000` 即可开始使用。

### 3.1 启动独立 worker（可选，推荐用于多实例形态）

```bash
npm run worker
```

### 3.1 Docker 一键启动（生产形态）

```bash
docker compose up --build
```

### 4. 构建生产版本

```bash
npm run build
```

构建产物将生成在 `dist` 目录中。

### 5. 预览构建结果

```bash
npm run preview
```

## 项目结构

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
│   ├── controllers/  # 控制器
│   ├── middleware/    # 中间件
│   ├── prompts/       # 提示词模板
│   ├── repositories/  # 数据访问层
│   ├── routes/        # API 路由
│   ├── services/      # 业务逻辑层
│   └── utils/         # 工具函数
├── services/          # 前端服务层
├── types/             # TypeScript 类型定义
└── utils/            # 工具函数
```

## 文档指南

### 架构与设计 (`architecture/`)

- [技术架构文档 (ARCHITECTURE.md)](architecture/ARCHITECTURE.md): 系统架构、前后端结构、数据模型、API 设计
- [中国特色生涯规划体系 (CHINESE_CAREER_PLAN_SYSTEM.md)](architecture/CHINESE_CAREER_PLAN_SYSTEM.md): 中西融合的生涯规划理论框架
- [前端风格指南 (FRONTEND_STYLE_GUIDE.md)](architecture/FRONTEND_STYLE_GUIDE.md): Meadow Mist 设计风格
- [提示词设计指南 (PROMPT_DESIGN_GUIDE.md)](architecture/PROMPT_DESIGN_GUIDE.md): 提示词设计理念与理论框架

### 安装与配置 (`setup/`)

- [构建与部署指南 (BUILD_GUIDE.md)](setup/BUILD_GUIDE.md): 开发/生产环境构建与部署
- [环境配置指南 (ENVIRONMENT_GUIDE.md)](setup/ENVIRONMENT_GUIDE.md): 环境变量与 LLM 供应商配置
- [数据库迁移指南 (DATABASE_MIGRATION_GUIDE.md)](setup/DATABASE_MIGRATION_GUIDE.md): SQLite 与 PostgreSQL 切换
- [内测指南 (BETA_TESTING_GUIDE.md)](setup/BETA_TESTING_GUIDE.md): 内测范围、环境配置、测试步骤

### API 与接口 (`api/`)

- [API 文档 (API_GUIDE.md)](api/API_GUIDE.md): RESTful API 接口说明
- [WebSocket 指南 (WEBSOCKET_GUIDE.md)](api/WEBSOCKET_GUIDE.md): WebSocket 连接与消息协议
- [OpenAPI 文档 (openapi.yaml)](api/openapi.yaml): 接口定义（Swagger 格式）
- [数据字典 (data-dictionary.csv)](api/data-dictionary.csv): 表结构字段说明（可直接用 Excel 打开）

### 运维与安全 (`operations/`)

- [回滚指南 (ROLLBACK_GUIDE.md)](operations/ROLLBACK_GUIDE.md): 问题处理与回滚策略
- [安全指南 (SECURITY.md)](operations/SECURITY.md): 安全架构与防护机制
- [下一步改造路线图 (NEXT_STEPS_ROADMAP.md)](operations/NEXT_STEPS_ROADMAP.md): 内网多用户 → 公网多用户的风险清单与改造优先级
- [项目优化指南 (PROJECT_OPTIMIZATION_GUIDE.md)](operations/PROJECT_OPTIMIZATION_GUIDE.md): 项目优化与理论结合建议

### 版本对比

- [内测版优势分析 (内测版优势分析.md)](内测版优势分析.md): 内测版与完整版对比及借鉴建议
- [差异文件说明 (差异文件说明.md)](差异文件说明.md): 内测版与主项目文件结构差异

### 社区

- [贡献指南 (CONTRIBUTING.md)](CONTRIBUTING.md): 如何参与项目贡献

## 贡献

欢迎提交 Issue 或 Pull Request 来完善 SkillMap！

## 许可证

MIT License
