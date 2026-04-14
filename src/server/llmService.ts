import { config } from './config';
import { ILLMProvider } from './llmProviders/base';
import { DeepSeekProvider, SiliconFlowProvider, QwenProvider, ArkProvider, CustomProvider } from './llmProviders/providers';
import { GeminiProvider } from './llmProviders/gemini';
import { DummyProvider } from './llmProviders/dummy';
import { LLMMessage, LLMResponse } from '../types/backend';
import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';

class LLMService {
  private provider: ILLMProvider;

  constructor() {
    const { provider, temperature, maxTokens } = config.llm;
    
    switch (provider) {
      case 'deepseek':
        this.provider = new DeepSeekProvider(
          config.llm.deepseek.apiKey,
          config.llm.deepseek.baseUrl,
          config.llm.deepseek.model,
          temperature,
          maxTokens
        );
        break;
      case 'siliconflow':
        this.provider = new SiliconFlowProvider(
          config.llm.siliconflow.apiKey,
          config.llm.siliconflow.baseUrl,
          config.llm.siliconflow.model,
          temperature,
          maxTokens
        );
        break;
      case 'qwen':
        this.provider = new QwenProvider(
          config.llm.qwen.apiKey,
          config.llm.qwen.baseUrl,
          config.llm.qwen.model,
          temperature,
          maxTokens
        );
        break;
      case 'ark':
        this.provider = new ArkProvider(
          config.llm.ark.apiKey,
          config.llm.ark.baseUrl,
          config.llm.ark.model,
          temperature,
          maxTokens
        );
        break;
      case 'custom':
        this.provider = new CustomProvider(
          config.llm.custom.apiKey,
          config.llm.custom.baseUrl,
          config.llm.custom.model,
          temperature,
          maxTokens
        );
        break;
      case 'dummy':
        this.provider = new DummyProvider();
        break;
      case 'gemini':
      default:
        this.provider = new GeminiProvider(
          config.llm.gemini.apiKey,
          config.llm.gemini.model,
          temperature,
          maxTokens
        );
        break;
    }
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        const response = await this.provider.chat(messages);
        const latency = Date.now() - startTime;
        
        // 记录日志
        this.logCall(response, latency, true);
        
        return response;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          const latency = Date.now() - startTime;
          this.logCall(null, latency, false, error instanceof Error ? error.message : String(error));
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('LLM 调用失败');
  }

  async chatJSON(systemPrompt: string, userPrompt: string): Promise<any> {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await this.chat(messages);
    return this.extractJSON(response.content);
  }

  private extractJSON(text: any): any {
    try {
      // 确保 text 是字符串
      let textStr: string;
      if (text === null || text === undefined) {
        textStr = '';
      } else if (typeof text === 'string') {
        textStr = text;
      } else {
        try {
          textStr = JSON.stringify(text);
        } catch {
          textStr = String(text);
        }
      }
      
      // 尝试直接解析
      return JSON.parse(textStr);
    } catch (e) {
      // 确保 text 是字符串
      let textStr: string;
      if (text === null || text === undefined) {
        textStr = '';
      } else if (typeof text === 'string') {
        textStr = text;
      } else {
        try {
          textStr = JSON.stringify(text);
        } catch {
          textStr = String(text);
        }
      }
      
      // 尝试从 Markdown 代码块中提取
      const markdownMatch = textStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch) {
        try {
          return JSON.parse(markdownMatch[1]);
        } catch (e2) {
          // 继续尝试其他方法
        }
      }

      // 尝试正则匹配最外层的 {}
      const braceMatch = textStr.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try {
          return JSON.parse(braceMatch[0]);
        } catch (e3) {
          // 尝试修复常见的 JSON 错误（如尾随逗号）
          const fixedJson = braceMatch[0]
            .replace(/,\s*([\]}])/g, '$1')
            .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":');
          try {
            return JSON.parse(fixedJson);
          } catch (e4) {
            throw new Error('无法解析 AI 返回的 JSON 数据，格式不正确');
          }
        }
      }
      throw new Error('AI 返回的内容不包含有效的 JSON 数据');
    }
  }

  private logCall(response: LLMResponse | null, latency: number, success: boolean, error?: string) {
    try {
      const db = getDb();
      const id = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO llm_logs (id, provider, model, prompt_tokens, completion_tokens, total_tokens, latency_ms, success, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const llmConfig = config.llm as any;
      const modelName = response?.model || llmConfig[config.llm.provider]?.model || 'unknown';
      
      stmt.run(
        id,
        this.provider.getName(),
        modelName,
        response?.usage.promptTokens || 0,
        response?.usage.completionTokens || 0,
        response?.usage.totalTokens || 0,
        latency,
        success ? 1 : 0,
        error || null
      );
    } catch (e) {
      console.error('记录 LLM 日志失败:', e);
    }
  }
}

export const llmService = new LLMService();
