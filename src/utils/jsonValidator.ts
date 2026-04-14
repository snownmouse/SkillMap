import { SkillTreeData } from '../types/skillTree';

/**
 * JSON 校验工具
 */
export function validateSkillTreeData(data: any): SkillTreeData {
  const defaultData: SkillTreeData = {
    version: '1.0',
    career: '未知职业',
    summary: '暂无简介',
    generatedAt: new Date().toISOString(),
    nodes: {},
    edges: [],
    categories: [],
    timeline: []
  };

  if (!data || typeof data !== 'object') return defaultData;

  // 基础字段校验与填充
  const validated: SkillTreeData = {
    version: data.version || defaultData.version,
    career: data.career || defaultData.career,
    summary: data.summary || defaultData.summary,
    generatedAt: data.generatedAt || defaultData.generatedAt,
    nodes: {},
    edges: Array.isArray(data.edges) ? data.edges : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    timeline: Array.isArray(data.timeline) ? data.timeline : []
  };

  // 节点校验
  if (data.nodes && typeof data.nodes === 'object') {
    Object.keys(data.nodes).forEach(id => {
      const node = data.nodes[id];
      validated.nodes[id] = {
        id: node.id || id,
        name: node.name || '未命名技能',
        description: node.description || '',
        category: node.category || 'general',
        difficulty: node.difficulty || 'beginner',
        status: node.status || 'locked',
        progress: typeof node.progress === 'number' ? node.progress : 0,
        dependencies: Array.isArray(node.dependencies) ? node.dependencies : [],
        resources: Array.isArray(node.resources) ? node.resources : [],
        subSkills: Array.isArray(node.subSkills) ? node.subSkills : [],
        conversations: Array.isArray(node.conversations) ? node.conversations : [],
        aiPendingMessage: node.aiPendingMessage || null,
        lastActive: node.lastActive || null,
        milestone: node.milestone || '',
        estimatedHours: typeof node.estimatedHours === 'number' ? node.estimatedHours : 0
      };
    });
  }

  return validated;
}
