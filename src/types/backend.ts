export type { SkillTreeData, SkillNode, SkillEdge, Category, TimelineEvent } from './skillTree';

// ============ LLM相关 ============

export type LLMProvider = 'gemini' | 'deepseek' | 'siliconflow' | 'qwen' | 'ark' | 'custom' | 'dummy';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

// ============ API请求/响应 ============

export interface GenerateTreeRequest {
  major: string;
  career: string;
  level: 'zero' | 'basic' | 'intermediate' | 'advanced';
  weeklyHours: number;
  notes: string;
  existingSkills?: string[];
}

export interface ChatRequest {
  treeId: string;
  nodeId: string;
  message: string;
}

export interface ChatResponse {
  reply: string;
  progressUpdate?: { nodeId: string; newProgress: number; reason: string };
  newInsight?: string;
  nextHook?: string;
  timelineEvent?: { type: string; summary: string };
}

// ============ 数据库模型 ============

export interface TreeRecord {
  id: string;
  userId: string;
  career: string;
  treeData: string; // JSON字符串
  createdAt: string;
  updatedAt: string;
}

export interface ChatRecord {
  id: string;
  treeId: string;
  nodeId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: string; // JSON字符串
  createdAt: string;
}
