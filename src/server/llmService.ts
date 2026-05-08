import { config } from './config';
import { ILLMProvider } from './llmProviders/base';
import { DeepSeekProvider, SiliconFlowProvider, QwenProvider, ArkProvider, CustomProvider } from './llmProviders/providers';
import { GeminiProvider } from './llmProviders/gemini';
import { DummyProvider } from './llmProviders/dummy';
import { LLMMessage, LLMResponse } from '../types/backend';
import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';

export interface ChatJSONStreamCallbacks {
  onChunk?: (text: string) => void;
  onPhase?: (phase: string, progress: number) => void;
}

class LLMService {
  private provider: ILLMProvider;

  constructor() {
    const { provider, temperature, maxTokens, requestTimeoutMs } = config.llm;

    switch (provider) {
      case 'deepseek':
        this.provider = new DeepSeekProvider(
          config.llm.deepseek.apiKey,
          config.llm.deepseek.baseUrl,
          config.llm.deepseek.model,
          temperature,
          maxTokens,
          requestTimeoutMs
        );
        break;
      case 'siliconflow':
        this.provider = new SiliconFlowProvider(
          config.llm.siliconflow.apiKey,
          config.llm.siliconflow.baseUrl,
          config.llm.siliconflow.model,
          temperature,
          maxTokens,
          requestTimeoutMs
        );
        break;
      case 'qwen':
        this.provider = new QwenProvider(
          config.llm.qwen.apiKey,
          config.llm.qwen.baseUrl,
          config.llm.qwen.model,
          temperature,
          maxTokens,
          requestTimeoutMs
        );
        break;
      case 'ark':
        this.provider = new ArkProvider(
          config.llm.ark.apiKey,
          config.llm.ark.baseUrl,
          config.llm.ark.model,
          temperature,
          maxTokens,
          requestTimeoutMs
        );
        break;
      case 'custom':
        this.provider = new CustomProvider(
          config.llm.custom.apiKey,
          config.llm.custom.baseUrl,
          config.llm.custom.model,
          temperature,
          maxTokens,
          requestTimeoutMs
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

  async chatJSONStream<T = any>(
    systemPrompt: string,
    userPrompt: string,
    callbacks: ChatJSONStreamCallbacks = {},
    postProcess?: (data: any) => T
  ): Promise<T> {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        let fullBuffer = '';
        let chunkBuffer = '';
        let lastFlushAt = Date.now();
        let sentSummary = false;
        let sentNodes = false;
        let sentMeta = false;
        let sentEdges = false;
        let sentCategories = false;
        let lastProgress = -1;

        const maybeEmitPhase = () => {
          const emit = (phase: string, progress: number) => {
            const clamped = Math.max(0, Math.min(99, Math.floor(progress)));
            if (clamped <= lastProgress) return;
            lastProgress = clamped;
            callbacks.onPhase?.(phase, clamped);
          };

          if (!sentSummary && fullBuffer.includes('"summary"')) {
            sentSummary = true;
            emit('正在分析职业路径', 10);
          }
          if (!sentNodes && fullBuffer.includes('"nodes"')) {
            sentNodes = true;
            emit('正在构建技能树结构', 20);
          }
          if (!sentMeta && fullBuffer.includes('"meta_growth"')) {
            sentMeta = true;
            emit('正在构建成长根节点', 30);
          }
          if (!sentEdges && fullBuffer.includes('"edges"')) {
            sentEdges = true;
            emit('正在连接依赖关系', 70);
          }
          if (!sentCategories && fullBuffer.includes('"categories"')) {
            sentCategories = true;
            emit('正在整理分类信息', 80);
          }
        };

        const flushChunk = () => {
          if (!chunkBuffer) return;
          callbacks.onChunk?.(chunkBuffer);
          chunkBuffer = '';
          lastFlushAt = Date.now();
        };

        const response: LLMResponse = await (async () => {
          if (typeof (this.provider as any).chatStream === 'function') {
            return (this.provider as any).chatStream(messages, {
              onDelta: (delta: string) => {
                if (!delta) return;
                fullBuffer += delta;
                chunkBuffer += delta;
                maybeEmitPhase();
                const now = Date.now();
                if (chunkBuffer.length >= 80 || now - lastFlushAt >= 200) {
                  flushChunk();
                }
              }
            });
          }

          const r = await this.provider.chat(messages);
          fullBuffer = r.content || '';
          callbacks.onChunk?.(fullBuffer);
          callbacks.onPhase?.('模型输出已就绪', 90);
          return r;
        })();

        flushChunk();
        const parsed = this.extractJSON(fullBuffer);
        const output = postProcess ? postProcess(parsed) : parsed;
        const latency = Date.now() - startTime;
        this.logCall(response, latency, true);
        callbacks.onPhase?.('解析完成', 99);
        return output;
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

  private cleanJsonString(text: string): string {
    let result = text;
    result = result.replace(/\uFEFF/g, '');
    result = result.replace(/\r\n/g, '\n');
    result = result.replace(/\r/g, '\n');
    result = result.replace(/\n\s*\n/g, '\n');
    result = result.replace(/([,:])\s*\n\s*/g, '$1 ');
    result = result.replace(/,\s*([\]}])/g, '$1');
    result = result.replace(/(['"])?([a-zA-Z0-9_\u4e00-\u9fa5]+)(['"])?\s*:/g, '"$2":');
    result = result.replace(/:\s*'([^']*)'/g, ': "$1"');
    result = result.replace(/'/g, '"');
    result = result.trim();
    return result;
  }

  private extractJSON(text: unknown): any {
    const textStr = this.coerceToString(text);
    console.log('[DEBUG] AI返回的原始内容长度:', textStr.length);
    console.log('[DEBUG] AI返回的原始内容开头:', textStr.substring(0, 500));
    console.log('[DEBUG] AI返回的原始内容结尾:', textStr.substring(Math.max(0, textStr.length - 500)));

    // 策略1：直接解析
    try {
      const result = JSON.parse(textStr);
      console.log('[DEBUG] 直接解析成功');
      return result;
    } catch (e) {
      console.log('[DEBUG] 直接解析失败:', (e as Error).message);
    }

    // 策略2：Markdown 代码块
    const markdownMatch = textStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      console.log('[DEBUG] 找到markdown代码块，长度:', markdownMatch[1].length);
      const cleaned = this.cleanJsonString(markdownMatch[1]);
      try {
        const result = JSON.parse(cleaned);
        console.log('[DEBUG] markdown代码块解析成功');
        return result;
      } catch (e) {
        console.log('[DEBUG] markdown代码块解析失败:', (e as Error).message);
      }
    }

    // 策略3：大括号包裹的内容
    const braceMatch = textStr.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      console.log('[DEBUG] 找到大括号内容，长度:', braceMatch[0].length);
      let jsonContent = braceMatch[0];

      // 智能补全：补充缺失的闭合括号
      jsonContent = this.fixIncompleteJson(jsonContent);
      console.log('[DEBUG] 修复后的JSON长度:', jsonContent.length);
      console.log('[DEBUG] 修复后的JSON结尾:', jsonContent.substring(Math.max(0, jsonContent.length - 200)));
      
      const cleaned = this.cleanJsonString(jsonContent);

      try {
        const result = JSON.parse(cleaned);
        console.log('[DEBUG] 修复后解析成功');
        return result;
      } catch (e) {
        console.log('[DEBUG] 修复后仍然失败:', (e as Error).message);
        console.log('[DEBUG] 清理后的JSON前1000字符:', cleaned.substring(0, 1000));
      }
    }

    throw new Error('无法解析 AI 返回的 JSON 数据，格式不正确');
  }

  private fixIncompleteJson(json: string): string {
    let result = json;

    // 统计未闭合的括号
    let openBraces = (result.match(/\{/g) || []).length;
    let closeBraces = (result.match(/\}/g) || []).length;
    let openBrackets = (result.match(/\[/g) || []).length;
    let closeBrackets = (result.match(/\]/g) || []).length;

    // 补充缺失的闭合括号
    for (let i = 0; i < openBraces - closeBraces; i++) {
      result += '}';
    }
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      result += ']';
    }

    // 移除末尾不完整的内容（从后往前找最后一个完整的字段）
    const lastValidIndex = this.findLastValidJsonIndex(result);
    if (lastValidIndex < result.length - 1) {
      result = result.substring(0, lastValidIndex + 1);
      // 补充闭合括号
      for (let i = 0; i < openBraces - closeBraces; i++) result += '}';
      for (let i = 0; i < openBrackets - closeBrackets; i++) result += ']';
    }

    return result;
  }

  private findLastValidJsonIndex(json: string): number {
    // 从后往前找到最后一个安全的截断点
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }

    // 如果括号不平衡，尝试从后往前找到平衡点
    if (braceCount > 0) {
      let count = 0;
      for (let i = json.length - 1; i >= 0; i--) {
        const char = json[i];
        if (char === '}') {
          count++;
          if (count === braceCount) {
            return i;
          }
        }
      }
    }

    return json.length - 1;
  }

  private coerceToString(text: unknown): string {
    if (text === null || text === undefined) return '';
    if (typeof text === 'string') return text;
    try {
      return JSON.stringify(text);
    } catch {
      return String(text);
    }
  }

  private logCall(response: LLMResponse | null, latency: number, success: boolean, error?: string) {
    try {
      const id = uuidv4();
      const llmConfig = config.llm as any;
      const modelName = response?.model || llmConfig[config.llm.provider]?.model || 'unknown';

      const db = getDb();
      db.query(
        `INSERT INTO llm_logs (id, provider, model, prompt_tokens, completion_tokens, total_tokens, latency_ms, success, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          this.provider.getName(),
          modelName,
          response?.usage.promptTokens || 0,
          response?.usage.completionTokens || 0,
          response?.usage.totalTokens || 0,
          latency,
          success,
          error || null
        ]
      ).catch(() => {});
    } catch (e) {
      console.error('记录 LLM 日志失败:', e);
    }
  }

  getRecentLogs(limit: number = 50): any[] {
    try {
      const db = getDb();
      if (typeof db.prepare === 'function') {
        return db.prepare('SELECT * FROM llm_logs ORDER BY created_at DESC LIMIT ?').all(limit);
      }
    } catch (e) {
      console.error('获取 LLM 日志失败:', e);
    }
    return [];
  }

  getLogStats(): { totalCalls: number; successRate: number; avgLatency: number } {
    try {
      const db = getDb();
      if (typeof db.prepare === 'function') {
        const row: any = db.prepare(`
          SELECT COUNT(*) as total,
                 SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
                 AVG(latency_ms) as avg_latency
          FROM llm_logs
        `).get();
        return {
          totalCalls: row?.total || 0,
          successRate: row?.total ? (row.success_count / row.total) * 100 : 0,
          avgLatency: row?.avg_latency || 0,
        };
      }
    } catch (e) {
      console.error('获取 LLM 统计失败:', e);
    }
    return { totalCalls: 0, successRate: 0, avgLatency: 0 };
  }
}

export const llmService = new LLMService();
