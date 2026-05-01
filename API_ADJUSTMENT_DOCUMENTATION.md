# API 调整文档 - 技能树生成系统

## 一、项目概述

本项目是一个技能树生成系统，使用 LLM（大型语言模型）生成个性化的技能树，帮助用户规划学习路径。系统包含前端和后端部分，通过 API 进行交互。

## 二、API 架构

### 1. 整体架构

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

### 2. 核心 API 端点

| 端点 | 方法 | 功能 | 请求体 (JSON) | 响应 |
|------|------|------|--------------|------|
| `/api/trees/generate` | POST | 生成技能树 | `{"career": "职业名称", "background": "背景信息", "goals": "学习目标"}` | `{"taskId": "任务ID"}` |
| `/api/trees/task/:taskId` | GET | 查询任务状态 | N/A | `{"status": "状态", "treeId": "技能树ID", "error": "错误信息"}` |
| `/api/trees` | GET | 获取技能树列表 | N/A | `{"trees": [{"id": "技能树ID", "career": "职业名称", "created_at": "创建时间"}]}` |
| `/api/trees/:id` | GET | 获取技能树详情 | N/A | `{"id": "技能树ID", "career": "职业名称", "tree_data": {...}}` |
| `/api/chat` | POST | 与技能节点对话 | `{"treeId": "技能树ID", "nodeId": "节点ID", "message": "消息内容"}` | `{"response": "AI回答"}` |

## 三、API 调整详情

### 1. 异步 API 调用系统

#### 1.1 问题背景

原始系统使用同步 API 调用，当 LLM 生成技能树耗时较长时，会导致：
- 前端请求超时
- 后端连接重置
- 用户体验差

#### 1.2 解决方案

实现异步 API 调用系统，包含：

- **任务管理**：创建任务并返回任务 ID
- **后台处理**：在后台线程中处理技能树生成
- **状态轮询**：前端通过轮询获取任务状态
- **结果获取**：任务完成后获取技能树数据

#### 1.3 代码实现

**后端控制器** (`src/server/controllers/treeController.ts`)：

```typescript
// 生成技能树
async generateSkillTree(req: Request, res: Response) {
  try {
    const { career, background, goals } = req.body;
    
    // 创建任务
    const taskId = generateTaskId();
    tasks[taskId] = {
      id: taskId,
      status: 'pending',
      createdAt: new Date(),
    };
    
    // 后台处理
    processTask(taskId, career, background, goals);
    
    // 返回任务 ID
    res.status(200).json({ taskId });
  } catch (error) {
    res.status(500).json({ error: '生成技能树失败' });
  }
}

// 查询任务状态
async getTaskStatus(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    const task = tasks[taskId];
    
    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }
    
    res.status(200).json({
      status: task.status,
      treeId: task.treeId,
      error: task.error,
    });
  } catch (error) {
    res.status(500).json({ error: '查询任务状态失败' });
  }
}

// 后台处理任务
async function processTask(taskId: string, career: string, background: string, goals: string) {
  try {
    tasks[taskId].status = 'in_progress';
    
    // 生成技能树
    const treeData = await llmService.generateSkillTree(career, background, goals);
    
    // 保存到数据库
    const treeId = await saveSkillTree(career, treeData);
    
    // 更新任务状态
    tasks[taskId].status = 'completed';
    tasks[taskId].treeId = treeId;
  } catch (error) {
    tasks[taskId].status = 'failed';
    tasks[taskId].error = error instanceof Error ? error.message : '生成技能树失败';
  }
}
```

**前端轮询** (`src/pages/GeneratePage.tsx`)：

```typescript
// 轮询任务状态
const pollTaskStatus = useCallback(async (taskId: string) => {
  try {
    const response = await fetch(`/api/trees/task/${taskId}`);
    const data = await response.json();
    
    if (data.status === 'completed') {
      // 获取技能树数据
      const treeResponse = await fetch(`/api/trees/${data.treeId}`);
      const treeData = await treeResponse.json();
      
      // 设置技能树
      setSkillTree(treeData.tree_data);
      
      // 跳转到技能树页面
      navigate(`/tree/${data.treeId}`);
    } else if (data.status === 'failed') {
      setError(data.error || '生成技能树失败');
      setIsGenerating(false);
    } else {
      // 继续轮询
      setTimeout(() => pollTaskStatus(taskId), 2000);
    }
  } catch (error) {
    setError('查询任务状态失败');
    setIsGenerating(false);
  }
}, [navigate, setSkillTree, setError, setIsGenerating]);

// 处理生成按钮点击
const handleGenerate = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!career) {
    setError('请输入职业名称');
    return;
  }
  
  setIsGenerating(true);
  setError(null);
  
  try {
    const response = await fetch('/api/trees/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        career,
        background,
        goals,
      }),
    });
    
    const data = await response.json();
    
    if (data.taskId) {
      // 开始轮询任务状态
      pollTaskStatus(data.taskId);
    } else {
      throw new Error('生成技能树失败');
    }
  } catch (error) {
    setError('生成技能树失败');
    setIsGenerating(false);
  }
};
```

### 2. LLM 集成调整

#### 2.1 问题背景

原始系统使用自定义的 fetch 调用，遇到了：
- API 端点格式错误（404 错误）
- API 密钥格式错误（401 错误）
- 连接重置错误（长时间运行）

#### 2.2 解决方案

使用 OpenAI 官方库集成 Volcengine Ark API：

- **正确的 API 端点**：使用 `/chat/completions` 而非 `/v1/chat/completions`
- **正确的 API 密钥**：使用完整的 API 密钥
- **官方库集成**：使用 OpenAI 官方库处理 API 调用

#### 2.3 代码实现

**LLM 服务** (`src/server/llmProviders/base.ts`)：

```typescript
import { OpenAI } from 'openai';

class OpenAIProvider {
  private client: OpenAI;

  constructor(apiKey: string, baseUrl: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: process.env.CUSTOM_LLM_MODEL || 'doubao-1-5-pro-32k-250115',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的技能树生成助手',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('LLM API 错误:', error);
      throw error;
    }
  }
}

export { OpenAIProvider };
```

**环境变量配置** (`.env`)：

```env
# LLM 配置
CUSTOM_LLM_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
CUSTOM_LLM_API_KEY=your_api_key_here
CUSTOM_LLM_MODEL=doubao-1-5-pro-32k-250115
```

### 3. 数据库集成

#### 3.1 问题背景

原始系统在保存技能树时遇到：
- NOT NULL 约束失败（缺少 career 字段）
- 技能树数据不完整

#### 3.2 解决方案

**数据库初始化** (`src/server/database.ts`)：

```typescript
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db: any = null;

async function initDatabase() {
  db = await open({
    filename: './data/skillmap.db',
    driver: sqlite3.Database,
  });

  // 创建表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS trees (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      career TEXT NOT NULL,
      tree_data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      tree_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      node_name TEXT NOT NULL,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_active_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS llm_logs (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      duration INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

export { initDatabase, db };
```

**保存技能树** (`src/server/controllers/treeController.ts`)：

```typescript
async function saveSkillTree(career: string, treeData: any): Promise<string> {
  try {
    const treeId = generateTreeId();
    
    // 补充元数据
    treeData.id = treeId;
    treeData.career = career;
    
    await db.run(
      'INSERT INTO trees (id, career, tree_data) VALUES (?, ?, ?)',
      [treeId, career, JSON.stringify(treeData)]
    );
    
    return treeId;
  } catch (error) {
    console.error('保存技能树失败:', error);
    throw error;
  }
}
```

## 四、API 调用示例

### 1. 生成技能树

**请求**：
```bash
POST /api/trees/generate
Content-Type: application/json

{
  "career": "前端开发工程师",
  "background": "有基础的HTML、CSS知识",
  "goals": "成为全栈前端开发工程师"
}
```

**响应**：
```json
{
  "taskId": "task_1234567890"
}
```

### 2. 查询任务状态

**请求**：
```bash
GET /api/trees/task/task_1234567890
```

**响应**：
```json
{
  "status": "completed",
  "treeId": "tree_1234567890",
  "error": null
}
```

### 3. 获取技能树详情

**请求**：
```bash
GET /api/trees/tree_1234567890
```

**响应**：
```json
{
  "id": "tree_1234567890",
  "career": "前端开发工程师",
  "tree_data": {
    "career": "前端开发工程师",
    "summary": "前端开发工程师技能树",
    "estimated_months": 6,
    "nodes": {
      "html_css": {
        "id": "html_css",
        "name": "HTML & CSS",
        "description": "网页结构和样式",
        "category": "core",
        "difficulty": "beginner",
        "status": "available",
        "progress": 0,
        "dependencies": [],
        "resources": [
          {
            "name": "HTML & CSS 基础教程",
            "type": "course",
            "url": "https://example.com"
          }
        ],
        "subSkills": [],
        "conversations": [],
        "aiPendingMessage": null,
        "lastActive": null,
        "milestone": "掌握HTML和CSS基础",
        "estimated_hours": 20
      }
    },
    "timeline": [
      {
        "id": "event_1",
        "title": "开始学习",
        "description": "开始学习前端开发",
        "date": "2024-01-01",
        "type": "milestone"
      }
    ]
  }
}
```

### 4. 与技能节点对话

**请求**：
```bash
POST /api/chat
Content-Type: application/json

{
  "treeId": "tree_1234567890",
  "nodeId": "html_css",
  "message": "HTML和CSS的区别是什么？"
}
```

**响应**：
```json
{
  "response": "HTML 是用于创建网页结构的标记语言，而 CSS 是用于设置网页样式的样式表语言。HTML 定义了网页的内容和结构，CSS 则控制这些内容的显示方式。"
}
```

## 五、错误处理

### 1. 常见错误及解决方案

| 错误代码 | 错误信息 | 解决方案 |
|---------|---------|--------|
| 404 | API 端点不存在 | 检查 API 端点路径是否正确 |
| 401 | API 密钥格式不正确 | 检查 API 密钥是否完整正确 |
| 400 | 请求参数错误 | 检查请求体是否包含所有必要参数 |
| 500 | 服务器内部错误 | 检查服务器日志，查看具体错误信息 |
| 504 | 网关超时 | 检查 LLM API 是否响应，考虑增加超时时间 |

### 2. 错误处理示例

**前端错误处理**：

```typescript
try {
  const response = await fetch('/api/trees/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      career,
      background,
      goals,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '请求失败');
  }
  
  const data = await response.json();
  // 处理成功响应
} catch (error) {
  setError(error instanceof Error ? error.message : '请求失败');
  setIsGenerating(false);
}
```

**后端错误处理**：

```typescript
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('错误:', err);
  
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
  });
});
```

## 六、性能优化

### 1. 缓存策略

**前端缓存** (`src/services/storage.ts`)：

```typescript
const STORAGE_KEY = 'skillmap_state';

export const storage = {
  save(state: any) {
    try {
      const { isGenerating, isChatLoading, error, ...persistentState } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentState));
    } catch (e) {
      console.warn('无法保存到 localStorage:', e);
    }
  },

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('无法从 localStorage 加载:', e);
      return null;
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
```

### 2. 批处理和限流

**后端限流**：

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP限制100个请求
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
```

## 七、安全措施

### 1. API 密钥保护

- 使用环境变量存储 API 密钥，避免硬编码
- 不在前端暴露 API 密钥
- 定期轮换 API 密钥

### 2. 输入验证

**后端验证**：

```typescript
import { body, validationResult } from 'express-validator';

app.post('/api/trees/generate',
  body('career').notEmpty().withMessage('职业名称不能为空'),
  body('background').optional().isString(),
  body('goals').optional().isString(),
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    
    // 处理请求
  }
);
```

### 3. CORS 配置

```typescript
import cors from 'cors';

app.use(cors({
  origin: '*', // 在生产环境中应该设置具体的域名
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

## 八、部署建议

### 1. 环境配置

- **开发环境**：使用本地 SQLite 数据库
- **生产环境**：考虑使用 PostgreSQL 或 MySQL 等更可靠的数据库

### 2. 服务器配置

- 增加服务器内存和 CPU 资源，以处理 LLM 生成任务
- 配置合适的超时时间，避免请求过早被终止
- 实现负载均衡，处理高并发请求

### 3. 监控和日志

- 实现详细的日志记录，包括 API 调用、错误信息等
- 使用监控工具，如 Prometheus、Grafana 等，监控系统性能
- 设置告警机制，及时发现和处理系统问题

## 九、总结

本 API 调整文档详细介绍了技能树生成系统的 API 架构、调整内容和使用方法。通过实现异步 API 调用系统、使用 OpenAI 官方库集成 LLM API、优化数据库存储等措施，系统现在能够稳定、高效地生成技能树，并提供良好的用户体验。

Jimi 可以参考本文档，按照类似的优化思路，实现自己的技能树生成系统，或者对现有系统进行优化。如果在实现过程中遇到问题，可以参考本文档的错误处理和故障排除部分，或者查阅相关的官方文档。