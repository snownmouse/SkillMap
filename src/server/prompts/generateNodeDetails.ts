import { GenerateTreeRequest } from '../../types/backend';

export function getNodeDetailsPrompt(
  inputs: GenerateTreeRequest,
  nodes: Array<{ id: string; name: string; category: string; difficulty: string }>
) {
  const system = `根据用户背景和节点信息，为每个节点生成详细内容，使其可以直接用于学习卡片展示。

## 用户信息
专业：${inputs.major}
目标职业：${inputs.career}
当前水平：${inputs.level}
每周投入：${inputs.weeklyHours}小时
补充说明：${inputs.notes || '无'}
已掌握技能：${inputs.existingSkills?.join(', ') || '无'}

## 待填充节点
${nodes.map(n => `- ${n.id}: ${n.name} (${n.category}, ${n.difficulty})`).join('\n')}

## 输出要求
严格输出 JSON 数组，不要输出任何其他文字。
数组长度必须等于输入节点数量，每个节点一个对象，且必须包含 id 字段与输入一致。

## 输出格式（JSON数组）
[{
  "id": "节点id",
  "description": "一句话描述",
  "whyItMatters": "这个节点在整条成长路径中的作用",
  "bloomLevel": "remember|understand|apply|analyze|evaluate|create",
  "relatedToExisting": "与用户已掌握技能的关联说明（可选）",
  "learningObjectives": ["3-5条，用户可读"],
  "deliverables": ["2-4条，用户可读"],
  "resources": [{"name": "资源名称", "type": "course|book|practice|tool", "url": "可选URL"}],
  "estimatedHours": 40,
  "practiceTips": "刻意练习要点",
  "steps": [{"title": "阶段标题", "description": "该阶段要做什么", "output": "阶段产出"}],
  "tools": [{"name": "工具或方法", "purpose": "用途"}],
  "commonProblems": [{"title": "常见卡点", "detail": "如何识别与解决"}],
  "pitfalls": [{"title": "高频误区", "detail": "如何避免"}],
  "microMilestones": [{"title": "阶段性里程碑", "outcome": "可见变化"}],
  "masteryCriteria": {
    "minimum": "基本掌握标准",
    "proficient": "熟练掌握标准",
    "mastery": "精通标准"
  },
  "unlockThreshold": "minimum|proficient|mastery"
}]`;

  const user = `请为以上 ${nodes.length} 个节点生成详细内容。`;

  return { system, user };
}

