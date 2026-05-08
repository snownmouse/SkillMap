# SkillMap - 对话驱动的技能探索地图

SkillMap 是一个基于 AI 的个性化技能规划与学习助手。它通过深度融合教育学理论（DACUM, Bloom's Taxonomy, ZPD）和心理学动机理论（SDT, Flow），为用户生成动态、可交互的技能树，并提供实时 AI 教练陪练。

## 核心特性

- **AI 驱动的技能树生成**: 输入你的专业、目标职业和当前水平，AI 为你量身定制学习路径
- **异步生成架构**: 采用任务队列与轮询机制，支持长耗时 LLM 生成，告别请求超时
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
- **缓存**: Redis（未配置则自动降级为内存缓存）
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

- [内测指南 (BETA_TESTING_GUIDE.md)](BETA_TESTING_GUIDE.md): 内测范围、环境配置、测试步骤
- [下一步改造路线图 (NEXT_STEPS_ROADMAP.md)](NEXT_STEPS_ROADMAP.md): 内网多用户 → 公网多用户的风险清单与改造优先级
- [数据库迁移指南 (DATABASE_MIGRATION_GUIDE.md)](DATABASE_MIGRATION_GUIDE.md): SQLite 与 PostgreSQL 切换
- [前端风格指南 (FRONTEND_STYLE_GUIDE.md)](FRONTEND_STYLE_GUIDE.md): Meadow Mist 设计风格
- [回滚指南 (ROLLBACK_GUIDE.md)](ROLLBACK_GUIDE.md): 问题处理与回滚策略
- [OpenAPI 文档 (openapi.yaml)](openapi.yaml): 接口定义
- [数据字典 (data-dictionary.csv)](data-dictionary.csv): 表结构字段说明（可直接用 Excel 打开）

## 贡献

欢迎提交 Issue 或 Pull Request 来完善 SkillMap！

## 许可证

MIT License
