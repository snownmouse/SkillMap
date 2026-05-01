# Gemini API 调整文档

## 一、Gemini API 介绍

Gemini 是 Google 开发的大型语言模型，提供了多种 API 接口用于文本生成、对话等功能。本文档针对 Gemini 的最早版本提供 API 调整说明，确保您能够正确集成和使用 Gemini API。

## 二、API 调整步骤

### 1. 获取 API Key

1. 访问 [Google AI Studio](https://makersuite.google.com/)
2. 登录您的 Google 账号
3. 创建一个新项目或选择现有项目
4. 在左侧菜单中选择 "API Keys"
5. 点击 "Create API Key" 按钮生成新的 API Key
6. 复制生成的 API Key，用于后续的 API 调用

### 2. 安装必要的依赖

```bash
# 使用 npm
npm install @google/generative-ai

# 使用 yarn
yarn add @google/generative-ai

# 使用 pnpm
pnpm add @google/generative-ai
```

### 3. 基本 API 调用

#### 3.1 文本生成

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

// 初始化客户端
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 选择模型（Gemini 最早版本）
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// 生成文本
async function generateText(prompt: string) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error('Error generating text:', error);
    throw error;
  }
}

// 使用示例
const prompt = "Write a short story about a robot learning to paint.";
generateText(prompt).then(console.log);
```

#### 3.2 对话功能

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

// 初始化客户端
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 选择模型
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// 创建对话
const chat = model.startChat({
  history: [
    {
      role: 'user',
      parts: [{ text: 'Hello, how are you?' }],
    },
    {
      role: 'model',
      parts: [{ text: 'I\'m doing well, thank you! How can I help you today?' }],
    },
  ],
});

// 发送消息
async function sendMessage(message: string) {
  try {
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// 使用示例
sendMessage("Tell me a joke").then(console.log);
```

## 三、API 配置调整

### 1. 环境变量配置

在项目根目录创建 `.env` 文件，添加以下内容：

```env
# Gemini API Key
GEMINI_API_KEY=your_api_key_here

# API 配置
GEMINI_MODEL=gemini-pro
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=1024
```

### 2. API 参数调整

#### 2.1 生成参数

```typescript
const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || 'gemini-pro',
  generationConfig: {
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
    maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '1024'),
    topP: 0.95,
    topK: 40,
  },
});
```

#### 2.2 安全设置

```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-pro',
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
  ],
});
```

## 四、错误处理

### 1. 常见错误及解决方案

| 错误类型 | 错误信息 | 解决方案 |
|---------|---------|--------|
| 认证错误 | `API key not valid` | 检查 API Key 是否正确，确保没有多余的空格 |
| 配额错误 | `Quota exceeded` | 检查 API 配额使用情况，等待配额重置或增加配额 |
| 参数错误 | `Invalid argument` | 检查请求参数是否符合 API 要求 |
| 安全错误 | `Safety rating blocked` | 调整提示词，避免包含敏感内容 |
| 网络错误 | `Network error` | 检查网络连接，重试请求 |

### 2. 错误处理代码示例

```typescript
async function generateTextWithErrorHandling(prompt: string) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // 检查安全评级
    if (response.safetyRating) {
      const safetyRating = response.safetyRating;
      if (safetyRating.category === 'HARM_CATEGORY_HARASSMENT' && 
          safetyRating.threshold === 'BLOCK_MEDIUM_AND_ABOVE') {
        throw new Error('Content blocked due to safety concerns');
      }
    }
    
    const text = response.text();
    return text;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('API key not valid')) {
        console.error('Invalid API Key. Please check your API Key.');
      } else if (error.message.includes('Quota exceeded')) {
        console.error('API quota exceeded. Please try again later.');
      } else if (error.message.includes('Invalid argument')) {
        console.error('Invalid argument. Please check your request parameters.');
      } else {
        console.error('Error generating text:', error.message);
      }
    }
    throw error;
  }
}
```

## 五、性能优化

### 1. 缓存策略

```typescript
// 简单的内存缓存
const cache = new Map<string, string>();

async function generateTextWithCache(prompt: string) {
  // 检查缓存
  if (cache.has(prompt)) {
    return cache.get(prompt)!;
  }
  
  // 生成文本
  const text = await generateText(prompt);
  
  // 存入缓存
  cache.set(prompt, text);
  
  return text;
}
```

### 2. 批处理请求

```typescript
async function generateMultipleTexts(prompts: string[]) {
  const results = await Promise.all(
    prompts.map(prompt => generateText(prompt))
  );
  return results;
}
```

### 3. 流式响应

```typescript
async function generateTextWithStreaming(prompt: string) {
  const result = await model.generateContentStream(prompt);
  
  let fullText = '';
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    fullText += chunkText;
    console.log('Streaming chunk:', chunkText);
  }
  
  return fullText;
}
```

## 六、集成到现有项目

### 1. 服务封装

```typescript
// src/services/geminiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-pro',
      generationConfig: {
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '1024'),
      },
    });
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating text:', error);
      throw error;
    }
  }

  async startChat(history: any[] = []) {
    const chat = this.model.startChat({ history });
    return {
      async sendMessage(message: string) {
        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
      },
    };
  }
}

export const geminiService = new GeminiService();
```

### 2. 使用示例

```typescript
// 使用文本生成
import { geminiService } from './services/geminiService';

async function generateSkillTree(career: string) {
  const prompt = `Generate a skill tree for ${career} with the following structure:
  {
    "career": "${career}",
    "summary": "Brief summary of the career path",
    "estimated_months": 6,
    "nodes": {
      "skill_id": {
        "id": "skill_id",
        "name": "Skill name",
        "description": "Skill description",
        "category": "core|specialization|general",
        "difficulty": "beginner|intermediate|advanced",
        "status": "available|in_progress|completed",
        "progress": 0,
        "dependencies": [],
        "resources": [
          {
            "name": "Resource name",
            "type": "book|course|video|article",
            "url": "https://example.com"
          }
        ],
        "subSkills": [],
        "conversations": [],
        "aiPendingMessage": null,
        "lastActive": null,
        "milestone": "Milestone description",
        "estimated_hours": 10
      }
    },
    "timeline": [
      {
        "id": "event_id",
        "title": "Event title",
        "description": "Event description",
        "date": "2024-01-01",
        "type": "milestone|learning|achievement"
      }
    ]
  }`;

  const result = await geminiService.generateText(prompt);
  return JSON.parse(result);
}
```

## 七、注意事项

1. **API Key 安全**：不要将 API Key 硬编码到代码中，使用环境变量或配置文件
2. **配额管理**：注意 API 调用配额，避免超出限制
3. **错误处理**：实现完善的错误处理机制，确保系统稳定性
4. **性能优化**：使用缓存和批处理等策略提高性能
5. **安全设置**：根据应用场景调整安全设置，避免内容被屏蔽
6. **API 版本**：本文档针对 Gemini 最早版本，后续版本可能有API变化

## 八、参考资源

- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API 文档](https://ai.google.dev/docs)
- [@google/generative-ai 文档](https://www.npmjs.com/package/@google/generative-ai)

## 九、故障排除

### 1. API Key 问题
- 确保 API Key 正确无误
- 确保 API Key 没有过期
- 确保项目启用了 Gemini API

### 2. 网络问题
- 检查网络连接
- 检查防火墙设置
- 尝试使用代理服务器

### 3. 配额问题
- 查看 API 配额使用情况
- 考虑升级到更高的配额计划
- 实现请求限流机制

### 4. 内容安全问题
- 调整提示词，避免敏感内容
- 调整安全设置阈值
- 考虑使用内容过滤机制

## 十、总结

本文档提供了针对 Gemini 最早版本的 API 调整说明，包括基本设置、API 调用、错误处理、性能优化等方面。通过正确配置和使用 Gemini API，您可以实现各种文本生成和对话功能，为您的应用添加强大的 AI 能力。

如果您在使用过程中遇到问题，请参考故障排除部分或查阅官方文档获取更多帮助。