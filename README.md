# SkillMap 项目说明文档

## 1. 项目概述
SkillMap 是一个对话驱动的技能探索地图应用。它通过 AI 生成个性化的技能路径，并提供实时对话复盘功能，帮助用户系统性地掌握新技能。

## 2. 技术栈
- **前端**: React 18, TypeScript, Vite, TailwindCSS, Cytoscape.js (可视化)
- **后端**: Node.js, Express, SQLite (better-sqlite3)
- **AI**: 支持多供应商 (Gemini, DeepSeek, SiliconFlow, Qwen) 及模拟模式 (Dummy)

## 3. 快速开始

### 3.1 环境准备
确保你已安装 Node.js 20+。

### 3.2 安装依赖
```bash
npm install
```

### 3.3 运行项目
```bash
npm run dev
```
项目默认运行在 `http://localhost:3000`。

## 4. 目录结构
- `src/server/`: 后端逻辑（路由、控制器、服务、数据库）
- `src/components/`: 前端 React 组件
- `src/hooks/`: 自定义 React Hooks
- `src/types/`: 类型定义
- `data/`: SQLite 数据库文件存储目录

## 5. 常见问题
- **如何切换 AI 供应商？** 修改 `.env` 文件中的 `LLM_PROVIDER` 变量。
- **数据存储在哪里？** 所有数据存储在本地的 `data/skillmap.db` 文件中。
