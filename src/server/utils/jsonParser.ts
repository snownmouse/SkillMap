export const jsonParser = {
  /**
   * 尝试从文本中提取 JSON
   */
  extractJSON(text: string): any {
    try {
      return JSON.parse(text);
    } catch (e) {
      // 尝试正则匹配
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (e2) {
          throw new Error('无法解析 AI 返回的 JSON 数据');
        }
      }
      throw new Error('AI 返回的内容不包含有效的 JSON');
    }
  },

  /**
   * 校验技能树数据结构
   */
  validateSkillTree(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (!data.nodes || typeof data.nodes !== 'object') return false;
    if (!Array.isArray(data.edges)) return false;
    
    // 检查节点数量
    const nodeCount = Object.keys(data.nodes).length;
    if (nodeCount < 5) return false;

    return true;
  }
};
