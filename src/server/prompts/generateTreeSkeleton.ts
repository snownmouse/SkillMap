import { GenerateTreeRequest } from '../../types/backend';

export function getGenerateTreeSkeletonPrompt(inputs: GenerateTreeRequest) {
  const planMeta = (inputs as any).planMeta && typeof (inputs as any).planMeta === 'object' ? (inputs as any).planMeta : undefined;
  const selectedStage = Array.isArray(planMeta?.stages)
    ? (planMeta.selectedStageId
        ? planMeta.stages.find((s: any) => s?.id === planMeta.selectedStageId) || planMeta.stages[0]
        : planMeta.stages[0])
    : undefined;
  const selectedPath = Array.isArray(planMeta?.paths)
    ? (planMeta.selectedPathId
        ? planMeta.paths.find((p: any) => p?.id === planMeta.selectedPathId) || planMeta.paths[0]
        : planMeta.paths[0])
    : undefined;
  const nodeCountText = selectedStage ? '8-14个（不含 meta_growth，仅覆盖本阶段目标）' : '12-18个（不含 meta_growth）';
  const planningContext = selectedStage || selectedPath || (typeof inputs.longTermGoal === 'string' && inputs.longTermGoal.trim())
    ? `
## 路径与阶段约束（重要）
- 长期目标：${(typeof inputs.longTermGoal === 'string' && inputs.longTermGoal.trim()) ? inputs.longTermGoal.trim() : (planMeta?.longTermGoal || inputs.career)}
- 当前阶段：${selectedStage ? `${selectedStage.title}（${selectedStage.objective}）` : '未指定'}
- 用户选择路线：${selectedPath ? `${selectedPath.name}（${selectedPath.description}）` : '未指定'}
- 本次仅生成“当前阶段”的节点骨架，不要提前铺开后续阶段才需要的节点。`
    : '';

  const system = `你是一个职业技能树设计师，遵循循证学习理论与目标管理方法，为用户构建科学的学习路径。

## 用户信息
专业：${inputs.major}
目标职业：${inputs.career}
当前水平：${inputs.level}
每周投入：${inputs.weeklyHours}小时
补充说明：${inputs.notes || '无'}
已掌握技能：${inputs.existingSkills?.join(', ') || '无'}
${planningContext}

## 重要约束
本次仅生成节点骨架，不要生成 resources/steps/tools/commonProblems/pitfalls/microMilestones/masteryCriteria 等详情字段，详情将在后续步骤填充。

## 输出要求
严格输出 JSON，不要输出任何其他文字。

## JSON格式（骨架）
{
  "career": "职业名",
  "summary": "一句话总结学习目标",
  "version": "1.0",
  "estimatedMonths": 6,
  "overallObjective": "总体学习目标（鼓舞人心）",
  "overallKeyResults": ["可量化结果1", "可量化结果2", "可量化结果3"],
  "nodes": {
    "meta_growth": {
      "id": "meta_growth",
      "name": "成长主线",
      "category": "core",
      "difficulty": "beginner",
      "status": "available",
      "dependencies": [],
      "milestone": "【O】明确成长主线 | 【KR】能描述学习路线与阶段目标",
      "jdFrequency": 90
    },
    "node_id": {
      "id": "唯一英文ID（snake_case）",
      "name": "动词短语",
      "category": "core|specialization|general",
      "difficulty": "beginner|intermediate|advanced",
      "status": "locked|available|in_progress|completed",
      "dependencies": ["前置技能ID列表"],
      "milestone": "【O】完成目标 | 【KR】可量化结果",
      "jdFrequency": 85
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
1. 节点数量：${nodeCountText}
2. dependencies 必须引用已存在的 node id，不能形成循环依赖
3. 如果用户已有技能，把对应节点标记为 status:"completed"
4. 没有前置依赖的节点 status 为"available"，有前置依赖的为"locked"`;

  const user = `请为我生成技能树骨架。`;

  return { system, user };
}
