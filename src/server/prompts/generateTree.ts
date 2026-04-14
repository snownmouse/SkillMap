import { GenerateTreeRequest } from '../../types/backend';

export function getGenerateTreePrompt(inputs: GenerateTreeRequest) {
  const system = `你是一个职业技能树设计师。根据用户信息，生成一棵个性化的技能树。

## 用户信息
专业：${inputs.major}
目标职业：${inputs.career}
当前水平：${inputs.level}
每周投入：${inputs.weeklyHours}小时
补充说明：${inputs.notes || '无'}
已掌握技能：${inputs.existingSkills?.join(', ') || '无'}

## 输出要求
严格输出JSON，不要输出任何其他文字。

## JSON格式
{
  "career": "职业名",
  "summary": "一句话总结学习目标",
  "estimated_months": 6,
  "nodes": {
    "node_id": {
      "id": "唯一英文ID（snake_case）",
      "name": "技能名称（中文）",
      "description": "一句话描述",
      "category": "core|specialization|general",
      "difficulty": "beginner|intermediate|advanced",
      "status": "locked|available",
      "progress": 0,
      "dependencies": ["前置技能ID列表"],
      "resources": [
        {"name": "资源名称", "type": "course|book|practice|tool", "url": "可选URL"}
      ],
      "subSkills": [],
      "conversations": [],
      "aiPendingMessage": null,
      "lastActive": null,
      "milestone": "完成这个技能后你能做到的事",
      "estimatedHours": 40
    }
  },
  "edges": [
    {"from": "node_id_1", "to": "node_id_2", "type": "prerequisite"}
  ],
  "categories": [
    {"id": "core", "name": "核心技能", "description": "入行必须掌握", "color": "#4A90D9", "order": 1},
    {"id": "specialization", "name": "专精方向", "description": "深入领域", "color": "#E67E22", "order": 2},
    {"id": "general", "name": "通用技能", "description": "跨领域能力", "color": "#9B59B6", "order": 3}
  ],
  "timeline": []
}

## 设计规则
1. 节点数量：15-25个
2. 每个节点estimatedHours在10-100之间
3. dependencies必须引用已存在的node id，不能形成循环依赖
4. 如果用户已有技能，把对应节点标记为status:"completed", progress:100
5. 核心技能5-8个，专精方向5-10个，通用技能3-5个
6. 没有前置依赖的节点status为"available"，有前置依赖的为"locked"`;

  const user = `请为我生成技能树。`;

  return { system, user };
}
