import { GoogleGenAI, Type } from "@google/genai";
import { ILLMProvider } from "./base";
import { LLMMessage, LLMResponse } from "../../types/backend";

export class GeminiProvider implements ILLMProvider {
  private ai: any;

  constructor(
    private apiKey: string,
    private model: string,
    private temperature: number,
    private maxTokens: number
  ) {
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  getName(): string {
    return 'gemini';
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    
    // 将历史转换为 Gemini 格式
    const contents = userMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction: systemMessage?.content,
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
        responseMimeType: "application/json",
      }
    });

    return {
      content: response.text,
      usage: {
        promptTokens: 0, // SDK 不直接返回
        completionTokens: 0,
        totalTokens: 0,
      },
      model: this.model,
    };
  }
}
