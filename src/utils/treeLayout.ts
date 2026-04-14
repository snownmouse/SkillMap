import { SkillTreeData } from '../types/skillTree';

/**
 * 技能树布局算法 (辅助 Cytoscape)
 */

export function getTopologicalSort(data: SkillTreeData): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    const node = data.nodes[id];
    if (node && node.dependencies) {
      node.dependencies.forEach(depId => visit(depId));
    }
    result.push(id);
  }

  Object.keys(data.nodes).forEach(id => visit(id));
  return result;
}

/**
 * 计算节点的层级 (用于自定义布局参考)
 */
export function calculateNodeLevels(data: SkillTreeData): Record<string, number> {
  const levels: Record<string, number> = {};

  function getLevel(id: string): number {
    if (levels[id] !== undefined) return levels[id];

    const node = data.nodes[id];
    if (!node || !node.dependencies || node.dependencies.length === 0) {
      levels[id] = 0;
      return 0;
    }

    const depLevels = node.dependencies.map(depId => getLevel(depId));
    const maxLevel = Math.max(...depLevels) + 1;
    levels[id] = maxLevel;
    return maxLevel;
  }

  Object.keys(data.nodes).forEach(id => getLevel(id));
  return levels;
}
