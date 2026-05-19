import { AgentBase, AgentCallOptions, AgentCallResult, AgentContext } from './base';
import { ILLMProvider } from '../llmProviders/base';
import { LLMMessage } from '../../types/backend';
import { modelRegistry } from './modelRegistry';

type OnDeltaCallback = (text: string) => void;

export class SkeletonAgent extends AgentBase {
  constructor() {
    super('skeleton');
  }

  async generateSkeleton(
    systemPrompt: string,
    userMessage: string,
    onDelta?: OnDeltaCallback
  ): Promise<AgentCallResult> {
    const provider = this.getProvider();
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    try {
      if (onDelta && provider.chatStream) {
        const result = await provider.chatStream(messages, { onDelta });
        return {
          content: result.content,
          usage: result.usage,
          model: modelRegistry.getConfig(this.role).model,
          role: this.role,
        };
      } else {
        const result = await provider.chat(messages);
        return {
          content: result.content,
          usage: result.usage,
          model: modelRegistry.getConfig(this.role).model,
          role: this.role,
        };
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('ECONNRESET')) {
        console.log(`[SkeletonAgent] 主provider失败，降级到orchestrator provider`);
        return await this.fallbackToRole('orchestrator', systemPrompt, userMessage, onDelta ? { stream: true, onChunk: onDelta } : {});
      }
      throw err;
    }
  }
}

export class DetailAgent extends AgentBase {
  constructor() {
    super('detail');
  }

  async fillNodeDetail(
    systemPrompt: string,
    userMessage: string
  ): Promise<AgentCallResult> {
    const provider = this.getProvider();

    try {
      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ];
      const result = await provider.chat(messages);
      return {
        content: result.content,
        usage: result.usage,
        model: modelRegistry.getConfig(this.role).model,
        role: this.role,
      };
    } catch (err) {
      const errorMsg = (err as Error).message;
      if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('ECONNRESET')) {
        console.log(`[DetailAgent] 主provider失败，降级到skeleton provider`);
        return await this.fallbackToRole('skeleton', systemPrompt, userMessage);
      }
      throw err;
    }
  }
}

export class CoachAgent extends AgentBase {
  constructor() {
    super('coach');
  }

  async chat(
    systemPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    latestMessage: string,
    onDelta?: OnDeltaCallback
  ): Promise<AgentCallResult> {
    const provider = this.getProvider();
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: latestMessage },
    ];

    try {
      if (onDelta && provider.chatStream) {
        const result = await provider.chatStream(messages, { onDelta });
        return {
          content: result.content,
          usage: result.usage,
          model: modelRegistry.getConfig(this.role).model,
          role: this.role,
        };
      } else {
        const result = await provider.chat(messages);
        return {
          content: result.content,
          usage: result.usage,
          model: modelRegistry.getConfig(this.role).model,
          role: this.role,
        };
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('ECONNRESET')) {
        console.log(`[CoachAgent] 主provider失败，降级到skeleton provider`);
        return await this.fallbackToRole('skeleton', systemPrompt, latestMessage, onDelta ? { stream: true, onChunk: onDelta } : {});
      }
      throw err;
    }
  }
}

export const skeletonAgent = new SkeletonAgent();
export const detailAgent = new DetailAgent();
export const coachAgent = new CoachAgent();