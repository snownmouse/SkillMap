import { modelRegistry, AgentRole } from './modelRegistry';
import { ILLMProvider } from '../llmProviders/base';
import { LLMMessage } from '../../types/backend';

export interface AgentContext {
  userId: string;
  profession: string;
  careerGoal: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  additionalInfo?: string;
  mode: 'skeleton' | 'full';
  taskId: string;
}

export interface AgentCallOptions {
  stream?: boolean;
  onChunk?: (chunk: string) => void;
}

export interface AgentCallResult {
  content: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
  role: AgentRole;
}

export class AgentBase {
  protected role: AgentRole;

  constructor(role: AgentRole) {
    this.role = role;
  }

  protected getProvider(): ILLMProvider {
    return modelRegistry.getProvider(this.role);
  }

  protected async callLLM(
    systemPrompt: string,
    userMessage: string,
    options: AgentCallOptions = {}
  ): Promise<AgentCallResult> {
    const provider = this.getProvider();
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    let content: string;
    let usage;

    if (options.stream && options.onChunk) {
      const result = await provider.chatStream(messages, { onDelta: options.onChunk });
      content = result.content;
      usage = result.usage;
    } else {
      const result = await provider.chat(messages);
      content = result.content;
      usage = result.usage;
    }

    return {
      content,
      usage,
      model: modelRegistry.getConfig(this.role).model,
      role: this.role,
    };
  }

  async fallbackToRole(
    fallbackRole: AgentRole,
    systemPrompt: string,
    userMessage: string,
    options: AgentCallOptions = {}
  ): Promise<AgentCallResult> {
    const savedRole = this.role;
    this.role = fallbackRole;
    try {
      console.log(`[Agent] ${savedRole} 降级到 ${fallbackRole}`);
      return await this.callLLM(systemPrompt, userMessage, options);
    } finally {
      this.role = savedRole;
    }
  }
}