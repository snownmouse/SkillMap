import { UserInput, SkillTreeData } from '../types/skillTree';

// 任务状态接口
export interface TaskStatus {
  taskId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: {
    id: string;
    data: SkillTreeData;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 技能地图 API 服务 (对接本地 Express 后端)
 */
export const difyApi = {
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
      existingSkills: inputs.existingSkills || []
    };
    
    const response = await fetch('/api/trees/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedInput),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '生成技能树失败');
    }

    return response.json();
  },

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const response = await fetch(`/api/trees/task/${taskId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取任务状态失败');
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeId: params.nodeId,
        message: params.userMessage
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '发送消息失败');
    }

    return response.json();
  }
};
