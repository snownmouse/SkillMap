import { UserInput, SkillTreeData, PlanMeta, PlanPath, PlanPathOption, PlanStage } from '../types/skillTree';

// 任务状态接口
export interface TaskStatus {
  taskId: string;
  status: 'pending' | 'in_progress' | 'streaming' | 'skeleton_ready' | 'node_filled' | 'completed' | 'failed';
  progress?: number;
  phase?: string;
  preview?: string;
  treeId?: string;
  attempts?: number;
  maxAttempts?: number;
  nextRetryAt?: string;
  result?: {
    id: string;
    data: SkillTreeData;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanningPathsResponseData {
  longTermGoal: string;
  stages: PlanStage[];
  paths: PlanPathOption[];
  recommendedPathId?: PlanPath;
  recommendedReason?: string;
}

interface DownloadFileResult {
  blob: Blob;
  fileName: string;
}

interface ImportSkillTreeResult {
  success: boolean;
  id: string;
  data: SkillTreeData;
}

function getDownloadFileName(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) return fallback;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return fallback;
}

/**
 * 技能地图 API 服务 (对接本地 Express 后端)
 */
export const difyApi = {
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    try {
      const stored = localStorage.getItem('skillmap_state');
      if (stored) {
        const state = JSON.parse(stored);
        if (state?.auth?.token) {
          headers['Authorization'] = `Bearer ${state.auth.token}`;
        }
      }
    } catch {
    }

    return headers;
  },
  /**
   * 生成技能树
   */
  async generateSkillTree(inputs: UserInput): Promise<{ taskId: string; status: string }> {
    // 转换字段名以匹配后端接口
    const formattedInput = {
      major: inputs.major,
      career: inputs.career,
      level: inputs.level,
      weeklyHours: inputs.weeklyHours,
      notes: inputs.notes || '',
      existingSkills: inputs.existingSkills || [],
      longTermGoal: inputs.longTermGoal,
      planMeta: inputs.planMeta as PlanMeta | undefined,
    };
    
    const response = await fetch('/api/trees/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify(formattedInput),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '生成技能树失败');
    }

    return response.json();
  },

  async getPlanningPaths(inputs: UserInput): Promise<PlanningPathsResponseData> {
    const payload = {
      major: inputs.major,
      career: inputs.career,
      level: inputs.level,
      weeklyHours: inputs.weeklyHours,
      notes: inputs.notes || '',
      existingSkills: inputs.existingSkills || [],
      longTermGoal: inputs.longTermGoal || inputs.career,
    };

    const response = await fetch('/api/planning/paths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '生成路径建议失败' }));
      throw new Error(error.error || '生成路径建议失败');
    }

    const result = await response.json();
    if (result?.success && result?.data) return result.data as PlanningPathsResponseData;
    return result as PlanningPathsResponseData;
  },

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const response = await fetch(`/api/trees/task/${taskId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取任务状态失败');
    }

    return response.json();
  },

  async getSkillTreeById(treeId: string): Promise<SkillTreeData> {
    const response = await fetch(`/api/trees/${treeId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取技能树失败');
    }

    return response.json();
  },

  async listTrees(params?: { page?: number; limit?: number; search?: string }): Promise<{ trees: { id: string; career: string; created_at: string }[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const queryParts: string[] = [];
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const response = await fetch(`/api/trees${query}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取技能树列表失败');
    }

    return response.json();
  },

  async exportSkillTree(treeId: string): Promise<DownloadFileResult> {
    const response = await fetch(`/api/trees/${treeId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify({}),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '导出技能树失败' }));
      throw new Error(error.error || '导出技能树失败');
    }

    return {
      blob: await response.blob(),
      fileName: getDownloadFileName(response.headers.get('Content-Disposition'), `skill-tree-${treeId}.json`)
    };
  },

  async exportJSON(treeId: string): Promise<DownloadFileResult> {
    const response = await fetch(`/api/trees/${treeId}/export-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '导出JSON失败' }));
      throw new Error(error.error || '导出JSON失败');
    }

    return {
      blob: await response.blob(),
      fileName: getDownloadFileName(response.headers.get('Content-Disposition'), `skill-tree-${treeId}-raw.json`)
    };
  },

  async importSkillTree(payload: unknown): Promise<ImportSkillTreeResult> {
    const response = await fetch('/api/trees/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '导入技能树失败' }));
      throw new Error(error.error || '导入技能树失败');
    }

    return response.json();
  },

  async getChatHistory(treeId: string, nodeId: string): Promise<{ messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string; metadata?: any }> }> {
    const response = await fetch(`/api/trees/${treeId}/chat/${nodeId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取聊天历史失败');
    }

    return response.json();
  },

  /**
   * 发送对话消息
   */
  async sendChatMessage(params: {
    nodeId: string;
    nodeName: string;
    nodeHistory: string;
    currentProgress: number;
    userMessage: string;
    treeSummary: string;
    fullTreeJson: string;
    conversationId: string;
    treeId?: string; // 需要传入 treeId
  }) {
    if (!params.treeId) throw new Error('缺少 treeId');

    const response = await fetch(`/api/trees/${params.treeId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify({
        nodeId: params.nodeId,
        message: params.userMessage
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '发送消息失败');
    }

    return response.json();
  },

  async cancelTask(taskId: string): Promise<void> {
    await fetch(`/api/tasks/${taskId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      credentials: 'include',
    });
  },

  async retryTask(taskId: string): Promise<void> {
    await fetch(`/api/tasks/${taskId}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      credentials: 'include',
    });
  },
};
