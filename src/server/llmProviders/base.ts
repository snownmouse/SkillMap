import { LLMMessage, LLMResponse } from '../../types/backend';
import { OpenAI } from 'openai';

export interface LLMStreamCallbacks {
  onDelta: (text: string) => void;
}

export interface ILLMProvider {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  chatStream?(messages: LLMMessage[], callbacks: LLMStreamCallbacks): Promise<LLMResponse>;
  getName(): string;
}

/**
 * 通用的 OpenAI 兼容供应商基类
 */
export abstract class OpenAICompatibleProvider implements ILLMProvider {
  private client: OpenAI;

  constructor(
    protected apiKey: string,
    protected baseUrl: string,
    protected model: string,
    protected temperature: number,
    protected maxTokens: number,
    protected requestTimeoutMs: number = 90000
  ) {
    // 初始化 OpenAI 客户端
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
    });
  }

  abstract getName(): string;

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    console.log('=== 开始 OpenAI 兼容 API 调用 ===');
    
    console.log('模型:', this.model);
    console.log('消息:', JSON.stringify(messages, null, 2));

    try {
      const startTime = Date.now();
      const response = await Promise.race([
        this.client.chat.completions.create({
          model: this.model,
          messages: messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`LLM 请求超时，超过 ${this.requestTimeoutMs}ms`)), this.requestTimeoutMs);
        })
      ]);
      const endTime = Date.now();

      console.log('API 调用耗时:', endTime - startTime, 'ms');
      console.log('响应:', JSON.stringify(response, null, 2));

      return {
        content: response.choices[0].message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        model: response.model || this.model,
      };
    } catch (error) {
      console.error('API 调用失败:', error);
      throw error;
    } finally {
      console.log('=== OpenAI 兼容 API 调用结束 ===');
    }
  }

  async chatStream(messages: LLMMessage[], callbacks: LLMStreamCallbacks): Promise<LLMResponse> {
    const startTime = Date.now();
    const stream = await Promise.race([
      this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        stream: true,
      }) as any,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`LLM 请求超时，超过 ${this.requestTimeoutMs}ms`)), this.requestTimeoutMs);
      })
    ]);

    let content = '';
    try {
      for await (const chunk of stream as any) {
        const delta = chunk?.choices?.[0]?.delta?.content || '';
        if (delta) {
          content += delta;
          callbacks.onDelta(delta);
        }
      }
    } finally {
      const latency = Date.now() - startTime;
      console.log('流式调用耗时:', latency, 'ms');
    }

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
