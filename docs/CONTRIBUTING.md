# SkillMap 贡献指南

感谢你愿意为 SkillMap 贡献代码！本文档将帮助你了解如何参与项目贡献。

## 1. 开发环境设置

### 1.1 前提条件

- Node.js 20.0.0 或更高版本
- npm 或 yarn
- Git

### 1.2 克隆项目

```bash
git clone <repository-url>
cd skillmap
```

### 1.3 安装依赖

```bash
npm install
```

### 1.4 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填写必要的配置
```

### 1.5 启动开发服务器

```bash
npm run dev
```

### 1.6 常用验证命令

```bash
npm run lint
npm test
npm run db:migrate
```

## 2. 代码风格

### 2.1 代码规范

- **TypeScript**: 遵循 TypeScript 最佳实践
- **类型检查**: 使用 `npm run lint` 进行类型检查（基于 TypeScript compiler）
- **缩进**: 使用 2 个空格进行缩进
- **命名**:
  - 变量和函数: camelCase
  - 类和接口: PascalCase
  - 常量: UPPER_SNAKE_CASE

### 2.2 代码注释

- 为复杂的函数和算法添加注释
- 为公共 API 添加 JSDoc 注释
- 保持注释与代码同步

### 2.3 React 组件规范

- 使用函数组件和 Hooks
- 为组件添加 TypeScript 类型定义
- 组件文件使用 PascalCase 命名

## 3. Git 工作流程

### 3.1 分支命名

- `feature/`: 新功能
- `fix/`: 错误修复
- `refactor/`: 代码重构
- `docs/`: 文档更新
- `test/`: 测试相关

示例:
```
feature/voice-input-support
fix/login-timeout-issue
refactor/chat-component
```

### 3.2 提交规范

使用清晰的提交信息：

```
<type>: <subject>

<body>

<footer>
```

类型 (type):
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具相关

示例:
```
feat: 添加语音输入功能

添加 useVoiceInput hook 支持语音识别
用户可以通过麦克风输入问题

Closes #123
```

### 3.3 Pull Request 流程

1. Fork 项目到你的仓库
2. 创建新分支: `git checkout -b feature/your-feature`
3. 提交代码: `git commit -m "feat: 添加新功能"`
4. 推送到分支: `git push origin feature/your-feature`
5. 创建 Pull Request

### 3.4 PR 描述模板

```markdown
## 描述
简要说明这个 PR 做了什么

## 解决的问题
列出相关的问题编号

## 改动内容
- 改动1
- 改动2

## 测试
描述你如何测试这些改动

## 截图（如有 UI 改动）
添加截图或 GIF
```

## 4. 目录结构

```
src/
├── components/        # 可复用组件
├── context/           # React 上下文
├── hooks/             # 自定义 Hooks
├── pages/             # 页面组件
├── server/            # 后端代码
│   ├── controllers/   # 控制器
│   ├── middleware/    # 中间件
│   ├── prompts/       # 提示词模板
│   ├── repositories/  # 数据访问层
│   ├── routes/        # API 路由
│   ├── services/      # 业务逻辑层
│   └── utils/         # 工具函数
├── services/          # 前端服务层
├── types/             # TypeScript 类型定义
└── utils/             # 工具函数
```

## 5. 添加新功能

### 5.1 前端组件

1. 在 `src/components/` 下创建或找到对应的子目录
2. 创建新组件文件
3. 导出组件
4. 在需要的地方使用

### 5.2 API 路由

1. 在对应的 Controller 中添加处理函数
2. 在 `src/server/routes/` 中添加路由配置
3. 更新 API 文档

### 5.3 LLM 提供商

1. 在 `src/server/llmProviders/` 中创建新的 Provider 文件
2. 实现 Provider 接口
3. 在 `providers.ts` 中注册新 Provider

## 6. 测试

### 6.1 测试说明

项目当前主要通过手动测试确保功能正常。自动化测试框架待后续集成。

### 6.2 测试建议

- 在开发过程中进行手动功能测试
- 测试不同的 LLM 提供商配置
- 验证数据库读写操作
- 检查 API 端点响应
- 测试 WebSocket 连接

## 7. 问题报告

### 7.1 提交 Bug

请在 GitHub Issues 中提交 Bug，包含：

- 清晰的问题描述
- 复现步骤
- 预期行为 vs 实际行为
- 环境信息（操作系统、Node 版本等）
- 相关截图或日志

### 7.2 功能建议

欢迎提交功能建议！请描述：

- 你的用例
- 期望的行为
- 可能的实现方案

## 8. 许可证

通过贡献代码，你同意将你的代码以 MIT 许可证发布。
