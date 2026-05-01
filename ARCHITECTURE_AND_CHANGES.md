# 技能树生成系统 - 架构说明与调整记录

## 一、架构说明

### 1. 系统架构

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ 前端 (React + TypeScript) │    │ 后端 (Express + Node.js) │    │ 数据库 (SQLite)     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                            │                            │
         │ 1. 生成技能树请求           │ 2. 创建任务                │ 3. 存储技能树数据      │
         │ POST /api/trees/generate   │                            │                        │
         │                            │ 4. 后台处理技能树生成        │ 5. 存储任务状态        │
         │ 6. 轮询任务状态            │ 7. 返回任务状态              │ 8. 查询任务状态        │
         │ GET /api/trees/task/:taskId│                            │                        │
         │                            │ 9. 技能树生成完成            │ 10. 更新任务状态       │
         │ 11. 获取技能树数据          │ 12. 返回技能树数据           │ 13. 查询技能树数据     │
         │ GET /api/trees/:id         │                            │                        │
```

### 2. 核心模块

#### 2.1 前端模块
- **GeneratePage**: 技能树生成页面，处理用户输入和任务轮询
- **TreePage**: 技能树展示页面，显示技能树图谱和节点详情
- **SkillTreeCanvas**: 技能树可视化组件，使用D3.js绘制技能树
- **SkillNodeDetail**: 技能节点详情组件，显示节点信息和学习资源
- **TimelineView**: 时间线组件，显示学习进度和事件
- **useSkillTree**: 技能树状态管理Hook
- **useChat**: 聊天功能Hook

#### 2.2 后端模块
- **treeController**: 技能树生成和管理控制器
- **chatController**: 聊天功能控制器
- **llmService**: LLM服务，处理与AI模型的交互
- **llmProviders**: LLM提供商实现，包括OpenAI、Gemini等
- **database**: 数据库连接和操作

#### 2.3 服务模块
- **difyApi**: Dify API封装
- **geminiService**: Gemini API封装
- **storage**: 本地存储封装

### 3. 数据流程

1. **技能树生成流程**:
   - 用户在前端填写技能树生成参数
   - 前端发送POST请求到 `/api/trees/generate`
   - 后端创建任务并返回任务ID
   - 前端开始轮询任务状态
   - 后端后台处理技能树生成
   - 技能树生成完成后，后端更新任务状态
   - 前端获取技能树数据并显示

2. **聊天流程**:
   - 用户点击技能节点，打开详情面板
   - 用户输入问题，发送到 `/api/chat`
   - 后端调用LLM生成回答
   - 后端返回回答，前端显示

3. **数据存储**:
   - 技能树数据存储在SQLite数据库中
   - 聊天记录存储在SQLite数据库中
   - 前端状态存储在localStorage中

### 4. 技术栈

- **前端**: React, TypeScript, D3.js, Vite
- **后端**: Express, Node.js, SQLite
- **LLM**: OpenAI-compatible API (Volcengine Ark)
- **数据存储**: SQLite, localStorage

## 二、调整记录

### 1. 异步API调用系统

**问题**: 长时间运行的API调用导致超时和连接重置错误

**解决方案**: 实现异步API调用系统，包含以下调整：

- **src/server/controllers/treeController.ts**:
  - 添加任务管理系统，支持pending、in_progress、completed、failed状态
  - 实现`processTask`函数，在后台处理技能树生成
  - 添加`getTaskStatus`方法，用于查询任务状态
  - 修复技能树数据中缺少id字段的问题

- **src/server/routes/tree.ts**:
  - 添加`/task/:taskId`端点，用于查询任务状态

- **src/services/difyApi.ts**:
  - 更新`generateSkillTree`方法，返回任务ID而非直接结果
  - 添加`getTaskStatus`方法，用于轮询任务状态
  - 定义`TaskStatus`接口，确保类型安全

- **src/pages/GeneratePage.tsx**:
  - 添加`pollTaskStatus`函数，定期检查任务状态
  - 修改`handleGenerate`函数，启动任务后自动开始轮询
  - 添加任务ID状态管理

### 2. LLM提供商集成

**问题**: API调用失败，出现401认证错误

**解决方案**: 集成OpenAI官方库，调整API调用方式：

- **src/server/llmProviders/base.ts**:
  - 使用OpenAI官方库替代fetch调用
  - 配置正确的base_url和api_key
  - 实现流式和非流式调用

- **package.json**:
  - 添加`openai`依赖

- **.env**:
  - 更新模型配置为`doubao-1-5-pro-32k-250115`

### 3. 前端修复

**问题**: 前端出现React key冲突错误

**解决方案**:

- **src/components/SkillTree/SkillNodeDetail.tsx**:
  - 修复学习资源部分的key冲突，使用`${res.name}-${res.type}-${idx}`作为key

- **src/components/Timeline/TimelineView.tsx**:
  - 修复时间线事件的key冲突，使用`${event.type}-${event.date}-${idx}`作为key

### 4. 测试和验证

**问题**: API调用失败，需要验证API功能

**解决方案**:

- 创建`test_api.mjs`，测试直接API调用
- 创建`test_server_api.mjs`，测试服务器API调用
- 验证技能树生成功能正常
- 验证聊天功能正常

### 5. 数据库和存储

**问题**: 技能树数据存储和读取

**解决方案**:

- 确保技能树数据完整存储在SQLite数据库中
- 实现前端本地存储，确保页面刷新后数据不丢失
- 验证数据库查询和API返回功能正常

## 三、总结

本次调整实现了以下功能：

1. **异步API调用系统**：解决了长时间运行API调用的超时问题
2. **OpenAI官方库集成**：提高了API调用的稳定性和可靠性
3. **前端bug修复**：解决了React key冲突问题
4. **完整的技能树生成系统**：支持从生成到显示的完整流程
5. **聊天功能**：支持与技能节点的对话交互
6. **时间线功能**：跟踪学习进度和事件

系统现在可以正常生成技能树，显示图谱，与技能节点进行对话，并且数据会持久化存储在本地。