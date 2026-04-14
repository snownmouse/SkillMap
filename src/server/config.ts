import path from 'path';
import { fileURLToPath } from 'url';
import { LLMProvider } from '../types/backend';
import dotenv from 'dotenv';

// 加载 .env 文件
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  dbPath: process.env.DB_PATH || path.join(process.cwd(), 'data', 'skillmap.db'),

  llm: {
    provider: (process.env.LLM_PROVIDER || 'dummy') as LLMProvider,
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4000'),

    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: 'gemini-3.1-pro-preview',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },
    siliconflow: {
      apiKey: process.env.SILICONFLOW_API_KEY || '',
      baseUrl: process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn',
      model: process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3',
    },
    qwen: {
      apiKey: process.env.QWEN_API_KEY || '',
      baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode',
      model: process.env.QWEN_MODEL || 'qwen-plus',
    },
    ark: {
      apiKey: process.env.ARK_API_KEY || '',
      baseUrl: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
      model: process.env.ARK_MODEL || 'doubao-pro-32k',
    },
    custom: {
      apiKey: process.env.CUSTOM_LLM_API_KEY || '',
      baseUrl: process.env.CUSTOM_LLM_BASE_URL || '',
      model: process.env.CUSTOM_LLM_MODEL || '',
    },
  },
};
