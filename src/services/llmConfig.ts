import type { LLMProvider } from '../types/backend';

export interface LlmConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const STORAGE_KEY = 'skillmap_llm_config';

export const llmConfigService = {
  get(): LlmConfig | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (typeof parsed.provider !== 'string') return null;
      return parsed as LlmConfig;
    } catch {
      return null;
    }
  },

  save(config: LlmConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('保存 LLM 配置失败:', e);
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
  },

  /**
   * 返回 Base64 编码的 X-LLM-Config header 值；若浏览器没有配置则返回空串。
   */
  buildHeader(): string {
    const cfg = this.get();
    if (!cfg) return '';
    try {
      const json = JSON.stringify(cfg);
      // 浏览器环境下用 btoa；Node SSR 走 Buffer
      if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(json)));
      if (typeof Buffer !== 'undefined') return Buffer.from(json, 'utf-8').toString('base64');
    } catch (e) {
      console.warn('编码 LLM 配置 header 失败:', e);
    }
    return '';
  },

  /**
   * 返回需要附加到 fetch 请求的 LLM 配置 header 对象；若无配置则返回空对象。
   */
  buildHeaders(): Record<string, string> {
    const value = this.buildHeader();
    if (!value) return {};
    return { 'X-LLM-Config': value };
  },

  async testConnection(config: LlmConfig): Promise<{ success: boolean; message: string; preview?: string }> {
    try {
      const authHeaders: Record<string, string> = {};
      try {
        const stored = localStorage.getItem('skillmap_state');
        if (stored) {
          const state = JSON.parse(stored);
          if (state?.auth?.token) {
            authHeaders['Authorization'] = `Bearer ${state.auth.token}`;
          }
        }
      } catch {
      }

      const response = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(config),
        credentials: 'include',
      });

      const data = await response.json();
      if (data?.success) {
        return {
          success: true,
          message: `连接成功（${data.provider}${data.model ? ' / ' + data.model : ''}）`,
          preview: data.preview,
        };
      }
      return {
        success: false,
        message: data?.error || '测试失败',
      };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : '网络错误',
      };
    }
  },
};
