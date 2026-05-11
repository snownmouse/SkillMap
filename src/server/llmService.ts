import { config } from './config';
import { ILLMProvider } from './llmProviders/base';
import { DeepSeekProvider, SiliconFlowProvider, QwenProvider, ArkProvider, CustomProvider } from './llmProviders/providers';
import { GeminiProvider } from './llmProviders/gemini';
import { DummyProvider } from './llmProviders/dummy';
import { LLMMessage, LLMResponse } from '../types/backend';
import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { IncrementalJsonParser, IncrementalParseResult } from './utils/IncrementalJsonParser';

export interface ChatJSONStreamCallbacks {
  onChunk?: (text: string) => void;
  onPhase?: (phase: string, progress: number) => void;
  onNode?: (nodeId: string, nodeData: any) => void;
  onMeta?: (meta: { career?: string; summary?: string; version?: string; estimatedMonths?: number; overallObjective?: string; overallKeyResults?: string[]; categories?: any[] }) => void;
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
        let lastMetaNotifiedAt = 0;

        const incrementalParser = new IncrementalJsonParser((result: IncrementalParseResult) => {
          callbacks.onNode?.(result.nodeId, result.nodeData);
        });

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

          const now = Date.now();
          if (now - lastMetaNotifiedAt > 500) {
            const meta = incrementalParser.getMeta();
            if (meta.career || meta.summary) {
              callbacks.onMeta?.(meta);
              lastMetaNotifiedAt = now;
            }
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
                incrementalParser.append(delta);
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
          incrementalParser.append(fullBuffer);
          callbacks.onChunk?.(fullBuffer);
          callbacks.onPhase?.('模型输出已就绪', 90);
          return r;
        })();

        flushChunk();

        const nodeCount = incrementalParser.getEmittedNodeCount();
        console.log('[DEBUG] 增量解析器提取节点数:', nodeCount);

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

  private extractJSON(text: unknown): any {
    const raw = this.coerceToString(text);
    console.log('[DEBUG] AI返回的原始内容长度:', raw.length);

    // 保存原始响应用于调试
    this.saveRawResponse(raw);

    const attemptParse = (label: string, input: string): any | null => {
      try {
        const result = JSON.parse(input);
        console.log('[DEBUG]', label, '解析成功');
        return result;
      } catch (e) {
        console.log('[DEBUG]', label, '解析失败:', (e as Error).message);
        return null;
      }
    };

    // 策略1：直接解析
    let result = attemptParse('直接', raw);
    if (result) return result;

    // 策略2：提取 markdown 代码块
    const markdownExtracted = this.extractJsonFromMarkdown(raw);
    if (markdownExtracted !== raw) {
      result = attemptParse('提取markdown代码块', markdownExtracted);
      if (result) return result;
    }

    // 策略3：提取大括号内容
    const braceExtracted = this.extractJsonFromBraces(markdownExtracted || raw);
    if (braceExtracted) {
      // 先尝试直接解析提取的内容
      result = attemptParse('提取大括号内容', braceExtracted);
      if (result) return result;

      // 尝试智能修复
      const fixed = this.smartFixJson(braceExtracted);
      result = attemptParse('智能修复', fixed);
      if (result) return result;
    }

    // 策略4：对原始内容进行智能修复
    const fixedRaw = this.smartFixJson(raw);
    result = attemptParse('原始内容智能修复', fixedRaw);
    if (result) return result;

    // 策略5：最后的救援 - 创建一个最小的有效JSON结构
    try {
      const rescueResult = this.createRescueJSON(raw);
      console.log('[DEBUG] 使用救援JSON结构');
      return rescueResult;
    } catch (e) {
      console.error('[ERROR] 救援JSON也失败了:', e);
    }

    throw new Error('无法解析 AI 返回的 JSON 数据，格式不正确');
  }

  private extractJsonFromMarkdown(text: string): string {
    // 提取 ```json ... ``` 或 ``` ... ``` 包裹的内容
    const patterns = [
      /```json\s*([\s\S]*?)```/i,
      /```\s*([\s\S]*?)```/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return text;
  }

  private extractJsonFromBraces(text: string): string | null {
    // 找到第一个 { 和最后一个 }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      return null;
    }

    return text.substring(firstBrace, lastBrace + 1);
  }

  private smartFixJson(json: string): string {
    let result = json;

    // 1. 移除 BOM 和不可见字符
    result = result.replace(/\uFEFF/g, '');
    result = result.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // 2. 移除控制字符（除了 \n, \r, \t）
    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // 2.5 修复缺少引号的值 - 用正则替换
    // 模式: :"《...》..." -> : "《...》..."
    result = result.replace(/:([^"\s\d\-{[\]tnf])([^,}\]]*?)"/g, (match, firstChar, rest) => {
      if (/[\u4e00-\u9fa5《「『]/.test(firstChar)) {
        return ': "' + firstChar + rest + '"';
      }
      return match;
    });
    // 模式: :"中文..." -> : "中文..."
    result = result.replace(/:"([^"]*?")/g, (match) => {
      return ': ' + match.slice(1);
    });

    // 2.5.5 修复字符串没有正确结束的情况
    // 使用状态机方法：在字符串内部遇到 ?} 表示字符串没有正确结束，需要添加 "
    let tempResult = '';
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      const nextChar = result[i + 1];
      
      if (escaped) {
        tempResult += char;
        escaped = false;
      } else if (char === '\\') {
        tempResult += char;
        escaped = true;
      } else if (char === '"') {
        inString = !inString;
        tempResult += char;
      } else if (inString && char === '?' && nextChar === '}') {
        // 在字符串内部遇到 ?}，说明字符串没有正确结束
        tempResult += '"?';
      } else {
        tempResult += char;
      }
    }
    result = tempResult;

    // 2.6 修复数组元素后面缺少 ] 的情况
    // 模式: 在数组内部，"中文内容", "英文key": 应该变成 "中文内容"], "英文key":
    // 使用更安全的方法：只修复 learningObjectives 数组中的问题
    result = result.replace(
      /("learningObjectives"\s*:\s*\[([^[\]]*?))",\s*"([a-zA-Z_]+)"\s*:/g,
      (match, prefix, contents, keyName) => {
        return prefix + '"], "' + keyName + '":';
      }
    );

    // 3. 如果还是无效，先尝试从后往前截断到最后一个有效的 JSON 对象/数组
    if (!this.isValidJson(result)) {
      result = this.truncateToValidJson(result);
    }

    // 4. 如果最后是在字符串内部，截断到最后一个完整的字符串之后
    if (!this.isValidJson(result)) {
      result = this.fixTrailingString(result);
    }

    // 5. 如果还是无效，尝试更激进的截断
    if (!this.isValidJson(result)) {
      result = this.aggressiveTruncate(result);
    }

    // 6. 处理换行符 - 在字符串外面移除换行，字符串内部保留
    result = this.normalizeNewlines(result);

    // 7. 统一引号 - 把单引号换成双引号（但要小心处理）
    result = this.fixQuotes(result);

    // 8. 移除尾部逗号
    result = result.replace(/,(\s*[\]\}])/g, '$1');

    // 9. 确保键名有引号
    result = this.ensureKeyQuotes(result);

    // 10. 处理缺失的逗号
    result = this.addMissingCommas(result);

    // 11. 最后尝试补全括号
    result = this.fixIncompleteJson(result);

    return result;
  }

  private fixMissingValueQuotes(json: string): string {
    let result = '';
    let i = 0;

    while (i < json.length) {
      const char = json[i];

      // 检测冒号后面是否缺少引号的值
      if (char === ':') {
        result += char;
        i++;

        // 跳过空格
        while (i < json.length && /\s/.test(json[i])) {
          result += json[i];
          i++;
        }

        // 检查下一个字符
        if (i < json.length) {
          const nextChar = json[i];
          // 如果是中文书名号《开头，说明缺少引号
          if (nextChar === '《' || nextChar === '「' || nextChar === '『') {
            // 添加左引号
            result += '"';
            // 找到对应的结束符号
            const endChars = nextChar === '《' ? '》' : (nextChar === '「' ? '」' : '』');
            while (i < json.length) {
              result += json[i];
              if (json[i] === endChars) {
                // 检查后面是否有引号
                let j = i + 1;
                while (j < json.length && /\s/.test(json[j])) j++;
                if (j < json.length && json[j] === '"') {
                  // 已有引号，跳过
                  i = j;
                } else {
                  // 没有引号，添加右引号
                  result += '"';
                }
                i++;
                break;
              }
              i++;
            }
            continue;
          }
          // 如果是中文字符开头但不是书名号，也尝试添加引号
          else if (/[\u4e00-\u9fa5]/.test(nextChar) && nextChar !== '"' && nextChar !== '{' && nextChar !== '[' && nextChar !== 'n' && nextChar !== 't' && nextChar !== 'f') {
            // 检查是否是 null, true, false
            const remaining = json.substring(i);
            if (remaining.startsWith('null') || remaining.startsWith('true') || remaining.startsWith('false')) {
              result += json[i];
              i++;
              continue;
            }
            // 添加左引号
            result += '"';
            // 找到值的结束位置（逗号、右括号、右方括号）
            let depth = 0;
            while (i < json.length) {
              const c = json[i];
              if (c === '{' || c === '[') depth++;
              else if (c === '}' || c === ']') {
                if (depth === 0) {
                  // 添加右引号
                  result += '"';
                  break;
                }
                depth--;
              }
              else if (c === ',' && depth === 0) {
                // 添加右引号
                result += '"';
                break;
              }
              else if (c === '"' && depth === 0) {
                // 已经有引号了，移除我们添加的左引号
                result = result.slice(0, -1);
                break;
              }
              result += c;
              i++;
            }
            continue;
          }
        }
        continue;
      }

      result += char;
      i++;
    }

    return result;
  }

  private isValidJson(text: string): boolean {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  private truncateToValidJson(json: string): string {
    // 从后往前找到最后一个安全的截断点
    let result = json;
    let lastValidIndex = 0;

    for (let i = 0; i < result.length; i++) {
      const testStr = result.substring(0, i + 1);
      if (this.isValidJson(testStr)) {
        lastValidIndex = i + 1;
      }
    }

    if (lastValidIndex > 0 && lastValidIndex < result.length) {
      result = result.substring(0, lastValidIndex);
      console.log('[DEBUG] 从后往前截断到有效位置:', lastValidIndex, '/', json.length);
    }

    // 如果截断后最后是一个不完整的字符串值，尝试继续截断
    result = this.fixTrailingString(result);

    // 如果还是无效，尝试更激进的截断
    if (!this.isValidJson(result)) {
      result = this.aggressiveTruncate(result);
    }

    return result;
  }

  private aggressiveTruncate(json: string): string {
    let result = json;

    const nodeEndPattern = /"unlockThreshold"\s*:\s*"?[a-zA-Z]+"?\s*\},?/g;
    let lastNodeEnd = 0;
    let m;
    while ((m = nodeEndPattern.exec(result)) !== null) {
      lastNodeEnd = m.index + m[0].length;
    }

    if (lastNodeEnd > 0) {
      // 截断到最后一个完整节点，去掉末尾逗号
      let truncated = result.substring(0, lastNodeEnd).replace(/,\s*$/, '');
      // 补全 JSON：关闭 nodes 对象和外层对象，添加 edges 等空数组
      truncated += '\n  },\n  "edges": [],\n  "categories": [],\n  "timeline": []\n}';

      if (this.isValidJson(truncated)) {
        console.log('[DEBUG] 通过 unlockThreshold 截断成功，保留完整节点');
        return truncated;
      }

      // 如果补全后仍然无效，尝试找到第一个完整的 JSON 对象
      let braceCount = 0;
      let inStr = false;
      let esc = false;
      let endPos = 0;
      for (let i = 0; i < truncated.length; i++) {
        const c = truncated[i];
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === '{') braceCount++;
        if (c === '}') {
          braceCount--;
          if (braceCount === 0) {
            endPos = i + 1;
            break;
          }
        }
      }
      if (endPos > 0) {
        const firstValid = truncated.substring(0, endPos);
        if (this.isValidJson(firstValid)) {
          console.log('[DEBUG] 通过第一个完整 JSON 对象截断成功');
          return firstValid;
        }
      }
    }

    // 策略2：原始的括号匹配方法
    let braceCount2 = 0;
    let inString2 = false;
    let escapeNext2 = false;
    let lastSafePosition = 0;

    for (let i = 0; i < result.length; i++) {
      const char = result[i];

      if (escapeNext2) {
        escapeNext2 = false;
        continue;
      }

      if (char === '\\') {
        escapeNext2 = true;
        continue;
      }

      if (char === '"') {
        inString2 = !inString2;
        continue;
      }

      if (!inString2) {
        if (char === '{') {
          braceCount2++;
        } else if (char === '}') {
          braceCount2--;
          if (braceCount2 === 0) {
            lastSafePosition = i + 1;
          }
        }
      }
    }

    if (lastSafePosition > 0 && lastSafePosition < result.length) {
      result = result.substring(0, lastSafePosition);
      result = this.fixIncompleteJson(result);
      console.log('[DEBUG] 激进截断到完整对象后:', lastSafePosition, '/', json.length);
    }

    return result;
  }

  private fixTrailingString(json: string): string {
    // 检查最后是否是一个被截断的字符串
    let inString = false;
    let escapeNext = false;
    let lastCompleteStringEnd = 0;

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
        if (inString) {
          lastCompleteStringEnd = i + 1;
        }
        inString = !inString;
      }
    }

    // 如果最后是在字符串内部，截断到最后一个完整的字符串之后
    if (inString && lastCompleteStringEnd > 0) {
      const truncated = json.substring(0, lastCompleteStringEnd);
      let result = truncated;

      // 从后往前找到最后一个 , 或 } 或 ]
      let lastValidEnd = truncated.length;
      for (let i = truncated.length - 1; i >= 0; i--) {
        const char = truncated[i];
        if (char === ',' || char === '}' || char === ']') {
          lastValidEnd = i + 1;
          break;
        }
      }

      result = truncated.substring(0, lastValidEnd);
      result = this.fixIncompleteJson(result);

      console.log('[DEBUG] 修复被截断的字符串，截断到位置:', lastValidEnd, '/', json.length);
      return result;
    }

    return json;
  }

  private normalizeNewlines(text: string): string {
    let result = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }

      if (!inString) {
        // 不在字符串内部，移除换行和多余空格
        if (char === '\r' || char === '\n') {
          result += ' ';
          continue;
        }
        if (/\s/.test(char)) {
          result += ' ';
          continue;
        }
      }

      result += char;
    }

    return result;
  }

  private fixQuotes(text: string): string {
    let result = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }

      // 如果在字符串内部，把单引号换成双引号
      if (inString && char === "'") {
        result += '"';
        continue;
      }

      result += char;
    }

    return result;
  }

  private ensureKeyQuotes(text: string): string {
    let result = '';
    let inString = false;
    let escapeNext = false;
    let afterColon = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        if (!inString) {
          afterColon = false;
        }
        continue;
      }

      // 如果在对象内部，键名后面是冒号且键名没加引号，给键名加引号
      if (!inString) {
        if (char === ':') {
          afterColon = true;
          result += char;
          continue;
        }

        // 在冒号后面，遇到字母/数字/中文开头的，尝试识别键名
        if (afterColon && /[a-zA-Z0-9_\u4e00-\u9fa5]/.test(char)) {
          // 检查前面是否有引号
          const lastQuoteIndex = result.lastIndexOf('"');
          const lastColonIndex = result.lastIndexOf(':');
          const lastBraceIndex = Math.max(result.lastIndexOf('{'), result.lastIndexOf(','));
          
          // 如果前面最近的分隔符是冒号且没有引号，说明这是键名
          if (lastColonIndex > lastBraceIndex && lastColonIndex > lastQuoteIndex) {
            // 找到这个键名的范围
            let keyEnd = i;
            while (keyEnd < text.length && /[a-zA-Z0-9_\u4e00-\u9fa5]/.test(text[keyEnd])) {
              keyEnd++;
            }
            const key = text.substring(i, keyEnd);
            
            // 看看键名后面是不是冒号
            let wsEnd = keyEnd;
            while (wsEnd < text.length && /\s/.test(text[wsEnd])) wsEnd++;
            
            if (text[wsEnd] === ':') {
              // 这是一个没有引号的键名，给它加上引号
              result += '"' + key + '"';
              i = keyEnd - 1;
              afterColon = false;
              continue;
            }
          }
        }

        // 遇到 {, }, [, ], , 等分隔符，重置状态
        if (char === '{' || char === '}' || char === '[' || char === ']' || char === ',') {
          afterColon = false;
        }
      }

      result += char;
    }

    return result;
  }

  private addMissingCommas(text: string): string {
    // 这个方法比较复杂，暂时不实现
    // 主要依赖后续的修复逻辑
    return text;
  }

  private stripMarkdown(text: string): string {
    // 移除 markdown 代码块标记
    let result = text.replace(/^```json\s*/im, '');
    result = result.replace(/^```\s*/im, '');
    result = result.replace(/\s*```$/im, '');
    return result.trim();
  }

  private fixIncompleteJson(json: string): string {
    let result = json;

    const countBraces = (s: string): { braces: number; brackets: number } => {
      let braces = 0;
      let brackets = 0;
      let inStr = false;
      let esc = false;
      for (const ch of s) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') braces++;
        if (ch === '}') braces--;
        if (ch === '[') brackets++;
        if (ch === ']') brackets--;
      }
      return { braces, brackets };
    };

    const counts = countBraces(result);

    for (let i = 0; i < counts.braces; i++) result += '}';
    for (let i = 0; i < counts.brackets; i++) result += ']';

    const lastValidIndex = this.findLastValidJsonIndex(result);
    if (lastValidIndex < result.length - 1) {
      result = result.substring(0, lastValidIndex + 1);
      const finalCounts = countBraces(result);
      for (let i = 0; i < finalCounts.braces; i++) result += '}';
      for (let i = 0; i < finalCounts.brackets; i++) result += ']';
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

  private saveRawResponse(raw: string): void {
    try {
      const logsDir = path.join(process.cwd(), 'logs', 'llm');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.join(logsDir, `raw-response-${timestamp}.txt`);
      fs.writeFileSync(filename, raw, 'utf-8');
      console.log('[DEBUG] 原始响应已保存到:', filename);
    } catch (e) {
      console.error('[ERROR] 保存原始响应失败:', e);
    }
  }

  private createRescueJSON(raw: string): any {
    // 尝试提取一些关键信息
    const goalMatch = raw.match(/"goal"\s*:\s*"([^"]*)"/i);
    const goal = goalMatch ? goalMatch[1] : '职业技能树';
    
    // 创建一个最小的、有效的技能树结构
    return {
      goal: goal,
      category: '互联网/科技',
      difficulty: 'beginner',
      nodes: {
        'n-001': {
          id: 'n-001',
          name: '技能树总览',
          description: '这是一个基础技能树，由于AI返回的数据不完整，请重新生成获取更多内容。',
          depth: 0,
          priority: 1,
          status: 'pending',
          progress: 0,
          category: '基础',
          conversations: [],
          requirements: [],
          subSkills: []
        }
      },
      edges: [],
      phases: [{
        id: 'p-001',
        name: '第一阶段：基础入门',
        description: '开始你的学习之旅',
        objectives: ['了解基本概念'],
        nodes: ['n-001']
      }],
      categories: {
        '基础': {
          id: 'c-001',
          name: '基础',
          description: '基础技能',
          color: '#667eea',
          icon: '📚'
        }
      }
    };
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
