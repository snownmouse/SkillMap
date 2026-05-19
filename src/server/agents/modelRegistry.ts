import { OpenAICompatibleProvider, ILLMProvider } from '../llmProviders/base';
import { DeepSeekProvider, SiliconFlowProvider, QwenProvider, ArkProvider, CustomProvider } from '../llmProviders/providers';
import { GeminiProvider } from '../llmProviders/gemini';
import { DummyProvider } from '../llmProviders/dummy';

export type AgentRole = 'orchestrator' | 'skeleton' | 'detail' | 'coach';
export type LLMProviderName = 'deepseek' | 'siliconflow' | 'qwen' | 'ark' | 'gemini' | 'custom' | 'dummy';

interface AgentModelConfig {
  provider: LLMProviderName;
  model: string;
  temperature: number;
  maxTokens: number;
  requestTimeoutMs: number;
}

interface ProviderCredentials {
  apiKey: string;
  baseUrl: string;
}

function env(key: string, fallback: string = ''): string {
  return (process.env[key] || fallback).trim();
}

function envInt(key: string, fallback: number): number {
  const v = parseInt(process.env[key] || '');
  return isNaN(v) ? fallback : v;
}

function envFloat(key: string, fallback: number): number {
  const v = parseFloat(process.env[key] || '');
  return isNaN(v) ? fallback : v;
}

function resolveCredentials(provider: LLMProviderName): ProviderCredentials {
  switch (provider) {
    case 'deepseek':
      return {
        apiKey: env('DEEPSEEK_API_KEY'),
        baseUrl: env('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
      };
    case 'siliconflow':
      return {
        apiKey: env('SILICONFLOW_API_KEY'),
        baseUrl: env('SILICONFLOW_BASE_URL', 'https://api.siliconflow.cn'),
      };
    case 'qwen':
      return {
        apiKey: env('QWEN_API_KEY'),
        baseUrl: env('QWEN_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode'),
      };
    case 'ark':
      return {
        apiKey: env('ARK_API_KEY'),
        baseUrl: env('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3'),
      };
    case 'gemini':
      return {
        apiKey: env('GEMINI_API_KEY'),
        baseUrl: '',
      };
    case 'custom':
      return {
        apiKey: env('CUSTOM_LLM_API_KEY'),
        baseUrl: env('CUSTOM_LLM_BASE_URL'),
      };
    case 'dummy':
      return { apiKey: '', baseUrl: '' };
  }
}

function resolveAgentConfig(role: AgentRole): AgentModelConfig {
  const prefix = `AGENT_${role.toUpperCase()}`;

  const provider = (env(`${prefix}_PROVIDER`) || env('LLM_PROVIDER', 'dummy')) as LLMProviderName;

  const modelFallback = providerModelFallback(provider);
  const model = env(`${prefix}_MODEL`, modelFallback);

  const temperature = envFloat(`${prefix}_TEMPERATURE`, 0.3);
  const maxTokens = envInt(`${prefix}_MAX_TOKENS`, roleDefaultMaxTokens(role));
  const requestTimeoutMs = envInt(`${prefix}_TIMEOUT_MS`, 600000);

  return { provider, model, temperature, maxTokens, requestTimeoutMs };
}

function roleDefaultMaxTokens(role: AgentRole): number {
  switch (role) {
    case 'orchestrator': return 4096;
    case 'skeleton': return 16384;
    case 'detail': return 8192;
    case 'coach': return 4096;
  }
}

function providerModelFallback(provider: LLMProviderName): string {
  switch (provider) {
    case 'deepseek': return env('DEEPSEEK_MODEL', 'deepseek-chat');
    case 'siliconflow': return env('SILICONFLOW_MODEL', 'deepseek-ai/DeepSeek-V3');
    case 'qwen': return env('QWEN_MODEL', 'qwen-plus');
    case 'ark': return env('ARK_MODEL', 'doubao-pro-32k');
    case 'gemini': return env('GEMINI_MODEL', 'gemini-3.1-pro-preview');
    case 'custom': return env('CUSTOM_LLM_MODEL', '');
    case 'dummy': return 'dummy-model';
  }
}

function createProvider(config: AgentModelConfig): ILLMProvider {
  const creds = resolveCredentials(config.provider);

  switch (config.provider) {
    case 'deepseek':
      return new DeepSeekProvider(creds.apiKey, creds.baseUrl, config.model, config.temperature, config.maxTokens, config.requestTimeoutMs);
    case 'siliconflow':
      return new SiliconFlowProvider(creds.apiKey, creds.baseUrl, config.model, config.temperature, config.maxTokens, config.requestTimeoutMs);
    case 'qwen':
      return new QwenProvider(creds.apiKey, creds.baseUrl, config.model, config.temperature, config.maxTokens, config.requestTimeoutMs);
    case 'ark':
      return new ArkProvider(creds.apiKey, creds.baseUrl, config.model, config.temperature, config.maxTokens, config.requestTimeoutMs);
    case 'custom':
      return new CustomProvider(creds.apiKey, creds.baseUrl, config.model, config.temperature, config.maxTokens, config.requestTimeoutMs);
    case 'gemini':
      return new GeminiProvider(creds.apiKey, config.model, config.temperature, config.maxTokens);
    case 'dummy':
      return new DummyProvider();
  }
}

class ModelRegistry {
  private providers: Map<string, ILLMProvider> = new Map();
  private roleConfigs: Map<AgentRole, AgentModelConfig> = new Map();
  private initialized = false;

  init() {
    if (this.initialized) return;
    const roles: AgentRole[] = ['orchestrator', 'skeleton', 'detail', 'coach'];

    for (const role of roles) {
      const cfg = resolveAgentConfig(role);
      this.roleConfigs.set(role, cfg);

      const key = `${role}:${cfg.provider}:${cfg.model}`;
      if (!this.providers.has(key)) {
        try {
          const provider = createProvider(cfg);
          this.providers.set(key, provider);
          console.log(`[ModelRegistry] ${role} → ${cfg.provider}/${cfg.model}`);
        } catch (e) {
          console.error(`[ModelRegistry] 创建 ${role} provider 失败:`, (e as Error).message);
        }
      }
    }

    this.initialized = true;
    console.log('[ModelRegistry] 初始化完成，共', this.providers.size, '个provider');
  }

  getProvider(role: AgentRole): ILLMProvider {
    this.init();
    const cfg = this.roleConfigs.get(role);
    if (!cfg) throw new Error(`未找到角色配置: ${role}`);

    const key = `${role}:${cfg.provider}:${cfg.model}`;
    const provider = this.providers.get(key);
    if (!provider) throw new Error(`角色 ${role} 的 provider 未创建: ${cfg.provider}/${cfg.model}`);
    return provider;
  }

  getConfig(role: AgentRole): AgentModelConfig {
    this.init();
    const cfg = this.roleConfigs.get(role);
    if (!cfg) throw new Error(`未找到角色配置: ${role}`);
    return cfg;
  }

  getOrchestrator(): ILLMProvider { return this.getProvider('orchestrator'); }
  getSkeleton(): ILLMProvider { return this.getProvider('skeleton'); }
  getDetail(): ILLMProvider { return this.getProvider('detail'); }
  getCoach(): ILLMProvider { return this.getProvider('coach'); }

  listConfigs(): Array<{ role: AgentRole; provider: string; model: string }> {
    this.init();
    return Array.from(this.roleConfigs.entries()).map(([role, cfg]) => ({
      role,
      provider: cfg.provider,
      model: cfg.model,
    }));
  }
}

export const modelRegistry = new ModelRegistry();