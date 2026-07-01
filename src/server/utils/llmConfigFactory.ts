import { config } from '../config';
import { ILLMProvider } from '../llmProviders/base';
import { DeepSeekProvider, SiliconFlowProvider, QwenProvider, ArkProvider, CustomProvider } from '../llmProviders/providers';
import { GeminiProvider } from '../llmProviders/gemini';
import { DummyProvider } from '../llmProviders/dummy';
import type { LLMProvider } from '../../types/backend';

export interface RequestLlmConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

function pickProviderConfig(name: LLMProvider): { apiKey: string; baseUrl: string; model: string } {
  switch (name) {
    case 'gemini':
      return {
        apiKey: config.llm.gemini.apiKey,
        baseUrl: '',
        model: config.llm.gemini.model,
      };
    case 'deepseek':
      return {
        apiKey: config.llm.deepseek.apiKey,
        baseUrl: config.llm.deepseek.baseUrl,
        model: config.llm.deepseek.model,
      };
    case 'siliconflow':
      return {
        apiKey: config.llm.siliconflow.apiKey,
        baseUrl: config.llm.siliconflow.baseUrl,
        model: config.llm.siliconflow.model,
      };
    case 'qwen':
      return {
        apiKey: config.llm.qwen.apiKey,
        baseUrl: config.llm.qwen.baseUrl,
        model: config.llm.qwen.model,
      };
    case 'ark':
      return {
        apiKey: config.llm.ark.apiKey,
        baseUrl: config.llm.ark.baseUrl,
        model: config.llm.ark.model,
      };
    case 'custom':
      return {
        apiKey: config.llm.custom.apiKey,
        baseUrl: config.llm.custom.baseUrl,
        model: config.llm.custom.model,
      };
    case 'dummy':
    default:
      return { apiKey: '', baseUrl: '', model: '' };
  }
}

export function createProviderFromConfig(reqConfig?: RequestLlmConfig): ILLMProvider | undefined {
  const providerName = reqConfig?.provider || config.llm.provider;
  const fallback = pickProviderConfig(providerName);

  const apiKey = reqConfig?.apiKey?.trim() || fallback.apiKey;
  const baseUrl = reqConfig?.baseUrl?.trim() || fallback.baseUrl;
  const model = reqConfig?.model?.trim() || fallback.model;
  const { temperature, maxTokens, requestTimeoutMs } = config.llm;

  switch (providerName) {
    case 'deepseek':
      return new DeepSeekProvider(apiKey, baseUrl, model, temperature, maxTokens, requestTimeoutMs);
    case 'siliconflow':
      return new SiliconFlowProvider(apiKey, baseUrl, model, temperature, maxTokens, requestTimeoutMs);
    case 'qwen':
      return new QwenProvider(apiKey, baseUrl, model, temperature, maxTokens, requestTimeoutMs);
    case 'ark':
      return new ArkProvider(apiKey, baseUrl, model, temperature, maxTokens, requestTimeoutMs);
    case 'custom':
      return new CustomProvider(apiKey, baseUrl, model, temperature, maxTokens, requestTimeoutMs);
    case 'dummy':
      return new DummyProvider();
    case 'gemini':
    default:
      return new GeminiProvider(apiKey, model, temperature, maxTokens, requestTimeoutMs);
  }
}

export function isRequestConfigEffective(reqConfig?: RequestLlmConfig): boolean {
  if (!reqConfig) return false;
  if (reqConfig.provider && reqConfig.provider !== config.llm.provider) return true;
  if (reqConfig.apiKey && reqConfig.apiKey.trim()) return true;
  if (reqConfig.baseUrl && reqConfig.baseUrl.trim()) return true;
  if (reqConfig.model && reqConfig.model.trim()) return true;
  return false;
}
