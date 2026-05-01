# SkillMap - 对话驱动的技能探索地图

SkillMap 是一个基于 AI 的个性化技能规划与学习助手。它通过深度融合教育学理论（DACUM, Bloom's Taxonomy, ZPD）和心理学动机理论（SDT, Flow），为用户生成动态、可交互的技能树，并提供实时 AI 教练陪练。

## 🚀 核心特性

- **AI 驱动的技能树生成**: 输入你的专业、目标职业和当前水平，AI 为你量身定制学习路径
- **异步生成架构**: 采用任务队列与轮询机制，支持长耗时 LLM 生成，告别请求超时
- **多供应商 LLM 支持**: 兼容 Gemini, DeepSeek, 硅基流动, 火山引擎 (Ark) 以及任何 OpenAI 兼容的自定义 API
- **教育学深度集成**: DACUM 任务分析、布鲁姆认知分类、最近发展区 (ZPD)
- **全局成长教练 (My Growth)**: 专门的元节点，负责职业规划、心态建设和整体进度复盘
- **实时对话复盘**: 点击任何节点即可与 AI 导师对话，AI 会根据对话内容动态更新你的学习进度
- **响应式设计**: 适配不同设备尺寸，提供一致的用户体验
- **双数据库支持**: 内测使用 SQLite（零成本），生产环境可切换到 PostgreSQL
- **完整监控体系**: 请求追踪、API 指标、LLM 调用统计、自动告警
- **限流保护**: LLM 调用限流、API 速率限制，防止滥用

## 🛠️ 技术栈

- **前端**: React 19, TypeScript, Vite, Tailwind CSS v4, Cytoscape.js, Motion, React Router v7
- **后端**: Node.js, Express, TypeScript, SQLite (better-sqlite3) / PostgreSQL (pg)
- **AI**: 集成多种主流 LLM SDK 与通用的 OpenAI 兼容协议
- **监控**: 请求追踪中间件、指标收集服务、自动告警服务

## 📦 快速开始

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
访问 `http://localhost:3002` 即可开始使用。

### 4. 数据库选择

项目支持双数据库模式，通过环境变量自动切换：

| 模式 | 配置 | 适用场景 |
|------|------|---------|
| **SQLite**（默认） | 不设置 `DB_HOST` | 内测、本地开发 |
| **PostgreSQL** | 设置 `DB_HOST=xxx` | 生产环境、高并发 |

## 📁 目录结构

- `src/server/`: 后端逻辑（路由、控制器、服务、数据库）
- `src/components/`: 前端 React 组件
- `src/hooks/`: 自定义 React Hooks
- `src/types/`: 类型定义
- `data/`: SQLite 数据库文件存储目录
- `docs/`: 项目文档
- `tests/`: 测试脚本

## 📖 文档

| 文档 | 说明 |
|------|------|
| [docs/BETA_TESTING_GUIDE.md](docs/BETA_TESTING_GUIDE.md) | 内测指南 |
| [docs/DATABASE_MIGRATION_GUIDE.md](docs/DATABASE_MIGRATION_GUIDE.md) | 数据库迁移指南 |
| [docs/ROLLBACK_GUIDE.md](docs/ROLLBACK_GUIDE.md) | 回滚预案 |
| [DESIGN_SPEC.md](DESIGN_SPEC.md) | 设计规范 |
| [ENVIRONMENT_GUIDE.md](ENVIRONMENT_GUIDE.md) | 环境配置指南 |

## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来完善 SkillMap！

## 📄 许可证

MIT License
