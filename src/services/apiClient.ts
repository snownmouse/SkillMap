import { UserInput, SkillTreeData } from '../types/skillTree';
import { handleError, createError } from '../utils/errorHandler';
import { withCache, cache } from '../utils/cache';

interface CareerPath {
  id: string;
  name: string;
  description: string;
  steps: { career: string; description: string; duration: string }[];
  fitScore: number;
}

interface CareerPlanResponse {
  targetCareer: string;
  paths: CareerPath[];
}

interface ProfileResponse {
  treeId: string;
  overallProgress: number;
  completedNodes: number;
  totalNodes: number;
  achievements: number;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const stored = localStorage.getItem('skillmap_state');
    if (stored) {
      try {
        const state = JSON.parse(stored);
        if (state.auth?.token) {
          headers['Authorization'] = `Bearer ${state.auth.token}`;
        }
      } catch (error) {
        console.warn('解析本地存储失败:', error);
      }
    }
  } catch (error) {
    console.warn('本地存储被禁用:', error);
  }
  return headers;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchApi<T>(url: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers
  };

  if (!navigator.onLine) {
    const error = createError('网络连接已断开，请检查网络设置后重试');
    handleError(error);
    throw error;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: 'include'
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      try {
        const errorData = await response.json();
        if (errorData.error === 'SESSION_EXPIRED') {
          const stored = localStorage.getItem('skillmap_state');
          if (stored) {
            const state = JSON.parse(stored);
            if (state.auth) {
              state.auth = { token: null, user: null };
              localStorage.setItem('skillmap_state', JSON.stringify(state));
            }
          }
          window.location.reload();
        }
      } catch (e) {
        // ignore
      }
      throw createError('登录已过期，请重新登录');
    }

    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5') * 1000;
        await delay(Math.min(retryAfter, 10000));
        return fetchApi<T>(url, options, retryCount + 1);
      }
      throw createError('请求过于频繁，请稍后再试');
    }

    if (!response.ok) {
      if (RETRYABLE_STATUS_CODES.includes(response.status) && retryCount < MAX_RETRIES) {
        const backoff = RETRY_DELAY_MS * Math.pow(2, retryCount);
        await delay(backoff);
        return fetchApi<T>(url, options, retryCount + 1);
      }

      let errorMsg = '请求失败';
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch {
        errorMsg = `请求失败 (${response.status})`;
      }
      throw createError(errorMsg);
    }

    const text = await response.text();

    if (!text) {
      throw createError(`服务器返回空响应 (${response.status}) ${url}`);
    }

    try {
      const data = JSON.parse(text);
      return data;
    } catch (e) {
      throw createError(`解析响应失败: ${text.substring(0, 100)}`);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      if (retryCount < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * Math.pow(2, retryCount));
        return fetchApi<T>(url, options, retryCount + 1);
      }
      const timeoutError = createError('请求超时，请稍后重试');
      handleError(timeoutError);
      throw timeoutError;
    }
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      if (retryCount < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * Math.pow(2, retryCount));
        return fetchApi<T>(url, options, retryCount + 1);
      }
      const networkError = createError('网络连接失败，请检查网络设置后重试');
      handleError(networkError);
      throw networkError;
    }
    
    handleError(error);
    throw error;
  }
}

export const apiClient = {
  async generateCareerPlan(inputs: UserInput): Promise<CareerPlanResponse> {
    // 职业规划结果不缓存，因为每次输入可能不同
    return fetchApi<CareerPlanResponse>('/api/careers/plan', {
      method: 'POST',
      body: JSON.stringify(inputs),
    });
  },

  async generateSkillTree(inputs: UserInput): Promise<{ taskId: string }> {
    // 生成任务不缓存
    return fetchApi<{ taskId: string }>('/api/trees/generate', {
      method: 'POST',
      body: JSON.stringify(inputs),
    });
  },

  async getTaskStatus(taskId: string): Promise<{ status: string; progress: number; stage: string; message: string; treeId?: string; error?: string }> {
    return fetchApi<{ status: string; progress: number; stage: string; message: string; treeId?: string; error?: string }>(`/api/tasks/${taskId}`);
  },

  async getSkillTreeById(treeId: string): Promise<SkillTreeData> {
    return withCache(`tree_${treeId}`, () => {
      return fetchApi<SkillTreeData>(`/api/trees/${treeId}`);
    }, 300000
    );
  },

  async updateSkillTree(treeId: string, treeData: Partial<SkillTreeData>): Promise<{ success: boolean }> {
    // 更新操作不缓存
    const result = await fetchApi<{ success: boolean }>(`/api/trees/${treeId}`, {
      method: 'PUT',
      body: JSON.stringify(treeData),
    });
    // 更新成功后清除缓存
    if (result.success) {
      cache.delete(`tree_${treeId}`);
      cache.delete(`profile_${treeId}`);
      // 清除相关的聊天缓存
      const chatKeys = Array.from(cache.keys()).filter(key => key.startsWith(`chat_${treeId}_`));
      chatKeys.forEach(key => cache.delete(key));
    }
    return result;
  },

  async getProfile(treeId: string): Promise<ProfileResponse> {
    // 个人资料缓存3分钟
    return withCache(`profile_${treeId}`, () => 
      fetchApi<ProfileResponse>(`/api/trees/${treeId}/profile`),
      180000 // 3分钟
    );
  },

  async listTrees(params?: { page?: number; limit?: number; search?: string }): Promise<{ trees: { id: string; career: string; created_at: string }[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const queryParts: string[] = [];
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    return withCache(`trees_list_${query}`, () =>
      fetchApi<{ trees: { id: string; career: string; created_at: string }[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/api/trees${query}`),
      60000
    );
  },

  async sendChatMessage(params: {
    nodeId: string;
    nodeName: string;
    nodeHistory: string;
    currentProgress: number;
    userMessage: string;
    treeSummary: string;
    conversationId: string;
    treeId?: string;
    isSummaryNode?: boolean;
    totalTreeProgress?: number;
    nodeProgressSummary?: string;
  }) {
    if (!params.treeId) {
      const error = createError('缺少 treeId');
      handleError(error);
      throw error;
    }

    const result = await fetchApi(`/api/trees/${params.treeId}/chat`, {
      method: 'POST',
      body: JSON.stringify({
        nodeId: params.nodeId,
        message: params.userMessage,
        isSummaryNode: params.isSummaryNode,
        totalTreeProgress: params.totalTreeProgress,
        nodeProgressSummary: params.nodeProgressSummary
      }),
    });
    cache.delete(`tree_${params.treeId}`);
    cache.delete(`chat_${params.treeId}_${params.nodeId}`);
    return result;
  },

  async getChatHistory(treeId: string, nodeId: string): Promise<{ messages: any[] }> {
    // 聊天历史缓存10分钟
    return withCache(`chat_${treeId}_${nodeId}`, () => 
      fetchApi<{ messages: any[] }>(`/api/trees/${treeId}/chat/${nodeId}`),
      600000 // 10分钟
    );
  },

  async transferTrees(): Promise<{ success: boolean; transferred: number; message: string }> {
    // 转移技能树不缓存
    return fetchApi<{ success: boolean; transferred: number; message: string }>('/api/trees/transfer', {
      method: 'POST'
    });
  },

  async exportSkillTree(treeId: string): Promise<Blob> {
    try {
      const response = await fetch(`/api/trees/${treeId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        let errorMsg = '导出失败';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `导出失败 (${response.status})`;
        }
        throw createError(errorMsg);
      }

      return response.blob();
    } catch (error) {
      console.error('导出请求失败:', error);
      throw error;
    }
  },

  async getChatSummary(treeId: string, nodeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/chat/${nodeId}/summary`);
  },

  async getLearningSuggestions(treeId: string, nodeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/chat/${nodeId}/suggestions`);
  },

  async searchChatMessages(treeId: string, query: string, limit = 20): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/chat/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  async getConversationList(treeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/chat/conversations`);
  },

  async getProgressStats(treeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/stats`);
  },

  async cancelTask(taskId: string): Promise<any> {
    return fetchApi(`/api/tasks/${taskId}/cancel`, {
      method: 'POST',
    });
  },

  async importSkillTree(treeData: any): Promise<any> {
    return fetchApi('/api/trees/import', {
      method: 'POST',
      body: JSON.stringify(treeData),
    });
  },

  async getAchievements(treeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/achievements`);
  },

  async getLearningPlan(treeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/learning-plan`);
  },

  async createLearningPlan(treeId: string, plan: any): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/learning-plan`, {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  },

  async updateLearningPlan(treeId: string, planId: string, updates: any): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/learning-plan/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async exportJSON(treeId: string): Promise<Blob> {
    const response = await fetch(`/api/trees/${treeId}/export-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
    });
    if (!response.ok) {
      throw createError('导出JSON失败');
    }
    return response.blob();
  },

  async getVersions(treeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/versions`);
  },

  async restoreVersion(treeId: string, versionNumber: number): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/versions/restore`, {
      method: 'POST',
      body: JSON.stringify({ versionNumber }),
    });
  },

  async getTimeline(treeId: string, filter?: { type?: string; nodeId?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }): Promise<{ events: any[]; total: number }> {
    const params = new URLSearchParams();
    if (filter?.type) params.set('type', filter.type);
    if (filter?.nodeId) params.set('nodeId', filter.nodeId);
    if (filter?.startDate) params.set('startDate', filter.startDate);
    if (filter?.endDate) params.set('endDate', filter.endDate);
    if (filter?.limit) params.set('limit', String(filter.limit));
    if (filter?.offset) params.set('offset', String(filter.offset));
    const query = params.toString();
    return fetchApi(`/api/trees/${treeId}/timeline${query ? `?${query}` : ''}`);
  },

  async getTimelineStats(treeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/timeline/stats`);
  },
};
