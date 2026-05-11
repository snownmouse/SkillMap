import { OpenAICompatibleProvider, ILLMProvider, LLMStreamCallbacks } from './base';
import { LLMMessage, LLMResponse } from '../../types/backend';

export class DeepSeekProvider extends OpenAICompatibleProvider {
  getName(): string {
    return 'deepseek';
  }
}

export class SiliconFlowProvider extends OpenAICompatibleProvider {
  getName(): string {
    return 'siliconflow';
  }
}

export class QwenProvider extends OpenAICompatibleProvider {
  getName(): string {
    return 'qwen';
  }
}

export class ArkProvider implements ILLMProvider {
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private model: string,
    private temperature: number,
    private maxTokens: number,
    private requestTimeoutMs: number = 600000
  ) {}

  getName(): string {
    return 'ark';
  }

  private decodeResponse(value: Uint8Array): string {
    try {
      return new TextDecoder('utf-8').decode(value);
    } catch {
      try {
        return new TextDecoder('gbk').decode(value);
      } catch {
        return new TextDecoder('gb2312').decode(value);
      }
    }
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    console.log('=== 开始 Ark API 调用 ===');

    const requestBody = {
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: this.temperature,
      max_completion_tokens: this.maxTokens,
    };

    console.log('请求 URL:', `${this.baseUrl}/chat/completions`);
    console.log('请求体:', JSON.stringify(requestBody, null, 2));

    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const endTime = Date.now();

      console.log('响应状态码:', response.status);
      console.log('响应状态:', response.statusText);
      console.log('API 调用耗时:', endTime - startTime, 'ms');

      if (!response.ok) {
        const error = await response.text();
        console.error('API 错误响应:', error);
        throw new Error(`LLM API 错误 (${response.status}): ${error}`);
      }

      const buffer = await response.arrayBuffer();
      const text = this.decodeResponse(new Uint8Array(buffer));
      
      console.log('解码后的响应内容:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('JSON 解析失败，尝试修复编码...');
        throw new Error('API 响应解析失败');
      }

      console.log('API 成功响应:', JSON.stringify(data, null, 2));

      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        model: data.model || this.model,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`LLM 请求超时，超过 ${this.requestTimeoutMs}ms`);
      }
      console.error('API 调用失败:', error);
      throw error;
    } finally {
      console.log('=== Ark API 调用结束 ===');
    }
  }

  async chatStream(messages: LLMMessage[], callbacks: LLMStreamCallbacks): Promise<LLMResponse> {
    const requestBody = {
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: this.temperature,
      max_completion_tokens: this.maxTokens,
      stream: true,
    };

    console.log('[DEBUG] Ark chatStream 请求参数:', JSON.stringify({
      model: this.model,
      temperature: this.temperature,
      max_completion_tokens: this.maxTokens,
      stream: true,
    }, null, 2));

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API 错误 (${response.status}): ${error}`);
    }
    if (!response.body) {
      throw new Error('LLM 响应不支持流式读取');
    }

    const reader = response.body.getReader();
    let buffer = '';
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const decoded = this.decodeResponse(value);
      buffer += decoded;

      while (true) {
        const idx = buffer.indexOf('\n');
        if (idx === -1) break;
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);

        if (!line || !line.startsWith('data:')) continue;
        const dataStr = line.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;

        try {
          const json = JSON.parse(dataStr);
          const choice = json?.choices?.[0];
          const delta = choice?.delta;
          
          // 过滤 thinking 内容，只保留实际回答
          if (delta?.content) {
            content += delta.content;
            callbacks.onDelta(delta.content);
          }
          // thinking_content 不混入 content，但可以记录日志
          if (delta?.thinking_content) {
            // 深度思考内容，不发送给前端
          }
          
          // 检测 finish_reason
          if (choice?.finish_reason) {
            console.log('[DEBUG] 流式完成，finish_reason:', choice.finish_reason);
          }
          if (json?.usage) {
            console.log('[DEBUG] 流式usage:', JSON.stringify(json.usage));
          }
        } catch (e) {
          console.log('[WARN] SSE 事件解析失败:', e.message, '数据:', dataStr.substring(0, 100));
        }
      }
    }

    if (buffer.trim()) {
      const lines = buffer.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;
        try {
          const json = JSON.parse(dataStr);
          const delta = json?.choices?.[0]?.delta;
          if (delta?.content) {
            content += delta.content;
            callbacks.onDelta(delta.content);
          }
        } catch (e) {
          console.log('[WARN] 残留 buffer 解析失败:', e.message, '数据:', dataStr.substring(0, 100));
        }
      }
    }

    console.log('[DEBUG] 流式读取完成，content 长度:', content.length, '预期至少 9507');

    const latency = Date.now() - startTime;
    console.log('Ark 流式调用耗时:', latency, 'ms');

    return {
      content,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      model: this.model,
    };
  }
}

export class CustomProvider extends OpenAICompatibleProvider {
  getName(): string {
    return 'custom';
  }
}
