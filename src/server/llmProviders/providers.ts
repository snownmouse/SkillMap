import { OpenAICompatibleProvider, ILLMProvider } from './base';
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
    private maxTokens: number
  ) {}

  getName(): string {
    return 'ark';
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    console.log('=== 开始 Ark API 调用 ===');
    
    // 构建请求体，使用 OpenAI 兼容的格式
    const requestBody = {
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: this.temperature
    };

    console.log('请求 URL:', `${this.baseUrl}/chat/completions`);
    console.log('请求体:', JSON.stringify(requestBody, null, 2));

    try {
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey.substring(0, 8)}...`, // 只显示 API Key 的前 8 个字符
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      const endTime = Date.now();

      console.log('响应状态码:', response.status);
      console.log('响应状态:', response.statusText);
      console.log('API 调用耗时:', endTime - startTime, 'ms');

      if (!response.ok) {
        const error = await response.text();
        console.error('API 错误响应:', error);
        throw new Error(`LLM API 错误 (${response.status}): ${error}`);
      }

      const data = await response.json();
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
      console.error('API 调用失败:', error);
      throw error;
    } finally {
      console.log('=== Ark API 调用结束 ===');
    }
  }
}

export class CustomProvider extends OpenAICompatibleProvider {
  getName(): string {
    return 'custom';
  }
}
