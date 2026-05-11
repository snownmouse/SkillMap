import { GenerateTreeRequest } from '../../types/backend';

export type DetailLevel = 'core' | 'full';

export function getNodeDetailsPrompt(
  inputs: GenerateTreeRequest,
  nodes: Array<{ id: string; name: string; category: string; difficulty: string }>,
  level: DetailLevel = 'core'
) {
  const levelDesc = level === 'core'
    ? `仅生成核心信息（description, whyItMatters, bloomLevel, relatedToExisting, learningObjectives, deliverables, estimatedHours, milestone, masteryCriteria, unlockThreshold），不生成resources/steps/tools/commonProblems/pitfalls/microMilestones/practiceTips。`
    : `生成完整详情，包含所有字段。`;

  const coreFormat = `{
  "id": "节点id",
  "description": "一句话描述",
  "whyItMatters": "在成长路径中的作用",
  "bloomLevel": "remember|understand|apply|analyze|evaluate|create",
  "relatedToExisting": "与已掌握技能的关联（可选）",
  "learningObjectives": ["3-5条"],
  "deliverables": ["2-4条"],
  "estimatedHours": 40,
  "milestone": "【O】目标 | 【KR】量化结果",
  "masteryCriteria": {"minimum": "合格线", "proficient": "熟练", "mastery": "精通"},
  "unlockThreshold": "minimum|proficient|mastery"
}`;

  const fullFormat = `{
  "id": "节点id",
  "description": "一句话描述",
  "whyItMatters": "在成长路径中的作用",
  "bloomLevel": "remember|understand|apply|analyze|evaluate|create",
  "relatedToExisting": "与已掌握技能的关联（可选）",
  "learningObjectives": ["3-5条"],
  "deliverables": ["2-4条"],
  "resources": [{"name": "资源名", "type": "course|book|practice|tool", "url": "可选"}],
  "estimatedHours": 40,
  "practiceTips": "刻意练习要点",
  "steps": [{"title": "阶段", "description": "做什么", "output": "产出"}],
  "tools": [{"name": "工具", "purpose": "用途"}],
  "commonProblems": [{"title": "卡点", "detail": "如何识别与解决"}],
  "pitfalls": [{"title": "误区", "detail": "如何避免"}],
  "microMilestones": [{"title": "里程碑", "outcome": "可见变化"}],
  "masteryCriteria": {"minimum": "合格线", "proficient": "熟练", "mastery": "精通"},
  "unlockThreshold": "minimum|proficient|mastery"
}`;

  const system = `根据用户背景和节点信息，为每个节点生成${level === 'core' ? '核心' : '完整'}内容，使其可以直接用于学习卡片展示。

## 用户信息
专业：${inputs.major}
目标职业：${inputs.career}
当前水平：${inputs.level}
每周投入：${inputs.weeklyHours}小时
补充说明：${inputs.notes || '无'}
已掌握技能：${inputs.existingSkills?.join(', ') || '无'}

## 待填充节点
${nodes.map(n => `- ${n.id}: ${n.name} (${n.category}, ${n.difficulty})`).join('\n')}

## 填充要求
${levelDesc}

## 输出要求
严格输出JSON数组，不要输出其他文字。
数组长度必须等于输入节点数量，每个节点一个对象，且必须包含id字段与输入一致。

## 输出格式（JSON数组）
[${level === 'core' ? coreFormat : fullFormat}]`;

  const user = `请为以上 ${nodes.length} 个节点生成${level === 'core' ? '核心' : '完整'}内容。`;

  return { system, user };
}
