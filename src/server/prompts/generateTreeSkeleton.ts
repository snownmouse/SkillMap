import { GenerateTreeRequest } from '../../types/backend';
import { careerClassificationService } from '../services/CareerClassificationService';

export async function getGenerateTreeSkeletonPrompt(inputs: GenerateTreeRequest, isMini?: boolean, designInstructionsText?: string) {
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
  const nodeCountText = isMini ? '至少15-20个（第一批种子节点，让用户能立刻开始学习）'
    : selectedStage ? '至少20-30个（仅覆盖本阶段目标）'
    : '至少30-50个';
  const planningContext = selectedStage || selectedPath || (typeof inputs.longTermGoal === 'string' && inputs.longTermGoal.trim())
    ? `
## 路径与阶段约束（重要）
- 长期目标：${(typeof inputs.longTermGoal === 'string' && inputs.longTermGoal.trim()) ? inputs.longTermGoal.trim() : (planMeta?.longTermGoal || inputs.career)}
- 当前阶段：${selectedStage ? `${selectedStage.title}（${selectedStage.objective}）` : '未指定'}
- 用户选择路线：${selectedPath ? `${selectedPath.name}（${selectedPath.description}）` : '未指定'}
- 本次仅生成"当前阶段"的节点骨架，不要提前铺开后续阶段的节点。`
    : '';

  const diSection = designInstructionsText ? `\n## 中国特色生涯设计指令\n${designInstructionsText}\n` : '';
  const nationalKbSection = await careerClassificationService.injectToPrompt(inputs.career);

  const system = `你是职业技能树设计师，为用户构建科学学习路径骨架。

用户信息：
- 专业：${inputs.major}
- 目标职业：${inputs.career}
- 当前水平：${inputs.level}
- 每周投入：${inputs.weeklyHours}小时
- 已掌握技能：${inputs.existingSkills?.join(', ') || '无'}

${planningContext}
${diSection}${nationalKbSection}
## 约束
1. 本次仅生成骨架，不生成resources/steps/tools/commonProblems/pitfalls/microMilestones/masteryCriteria
2. 节点数：${nodeCountText} - 【必须达到】尽可能接近上限
3. 树状结构：必须有分支，根节点3-5个，深度4-6层
4. dependencies引用已存在node id，不形成循环
5. 已有技能标记status:"completed"
6. 无前置依赖→"available"，有前置→"locked"

## 输出JSON格式
{
  "career": "职业名",
  "summary": "一句话总结",
  "version": "1.0",
  "estimatedMonths": 6,
  "overallObjective": "总体目标",
  "overallKeyResults": ["结果1", "结果2", "结果3"],
  "nodes": {
    "node_id": {
      "id": "snake_case英文ID",
      "name": "技能名称",
      "category": "core|specialization|general",
      "difficulty": "beginner|intermediate|advanced",
      "status": "locked|available|in_progress|completed",
      "dependencies": ["前置技能ID"],
      "milestone": "【O】目标 | 【KR】量化结果",
      "jdFrequency": 85
    }
  },
  "edges": [{"from": "id1", "to": "id2", "type": "prerequisite"}],
  "categories": [
    {"id": "core", "name": "核心技能", "description": "入行必须掌握", "color": "#4A90D9", "order": 1},
    {"id": "specialization", "name": "专精方向", "description": "深入领域", "color": "#E67E22", "order": 2},
    {"id": "general", "name": "通用技能", "description": "跨领域能力", "color": "#9B59B6", "order": 3}
  ],
  "timeline": []
}`;

  const user = `请为我生成技能树骨架。`;

  return { system, user };
}
