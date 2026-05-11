import { GenerateTreeRequest } from '../../types/backend';
import type { SkillTreeData } from '../../types/skillTree';

export function getExpandTreePrompt(
  inputs: GenerateTreeRequest,
  existingTree: SkillTreeData,
  existingNodeIds: string[]
) {
  const planMeta = (inputs as any).planMeta && typeof (inputs as any).planMeta === 'object' ? (inputs as any).planMeta : undefined;
  const selectedStage = Array.isArray(planMeta?.stages)
    ? (planMeta.selectedStageId
        ? planMeta.stages.find((s: any) => s?.id === planMeta.selectedStageId) || planMeta.stages[0]
        : planMeta.stages[0])
    : undefined;
  const allStages = Array.isArray(planMeta?.stages) ? planMeta.stages : [];
  const currentStageIndex = selectedStage ? allStages.findIndex((s: any) => s?.id === selectedStage.id) : -1;
  const nextStage = currentStageIndex >= 0 && currentStageIndex < allStages.length - 1 ? allStages[currentStageIndex + 1] : undefined;

  const existingNodeNames = existingNodeIds.map(id => {
    const n = existingTree.nodes[id];
    return n ? `${id} (${n.name})` : id;
  }).join(', ');

  const stageContext = nextStage
    ? `
## 下一阶段信息
- 阶段名称：${nextStage.title}
- 阶段目标：${nextStage.objective}
- 关键结果：${nextStage.keyResults?.join('、') || '未指定'}
- 建议时长：${nextStage.suggestedMonths || '待定'}个月`
    : selectedStage
    ? `## 当前阶段补充
继续为"${selectedStage.title}"阶段生成更多技能节点。`
    : '';

  const system = `你是一个职业技能树设计师，负责为已存在的技能树补充更多节点。

## 用户信息
专业：${inputs.major}
目标职业：${inputs.career}
当前水平：${inputs.level}
每周投入：${inputs.weeklyHours}小时
补充说明：${inputs.notes || '无'}
已掌握技能：${inputs.existingSkills?.join(', ') || '无'}
${inputs.longTermGoal ? `\n长期目标：${inputs.longTermGoal}` : ''}
${stageContext}

## 已存在的节点
当前技能树已有以下节点（ID + 名称）：
${existingNodeNames}

## 展开要求
1. 生成 5-8 个**新的**技能节点，连接到现有节点
2. 新节点的 dependencies 可以引用现有节点（用已有的 node ID）或新节点
3. 确保新节点与现有节点形成整体树状结构
4. 节点的 difficulty 应根据其在路径中的位置递进
5. 至少包含 2 个根节点（dependencies 为空），以便用户可以看到多个展开方向

## 输出要求
严格输出 JSON，不要输出任何其他文字。

## JSON格式
{
  "nodes": {
    "new_node_id": {
      "id": "唯一英文ID（snake_case）",
      "name": "技能名称（中文）",
      "category": "core|specialization|general",
      "difficulty": "beginner|intermediate|advanced",
      "status": "available",
      "dependencies": ["已有节点ID或其他新节点ID"],
      "milestone": "【O】完成目标 | 【KR】可量化结果",
      "jdFrequency": 85
    }
  },
  "edges": [
    {"from": "node_id_1", "to": "node_id_2", "type": "prerequisite"}
  ]
}

## 设计规则
1. 新节点数量：5-8 个
2. dependencies 优先引用已存在的节点，使新内容融入现有技能树
3. 新节点之间的依赖关系要合理，不能形成循环依赖
4. 难度递进要平滑`;

  const user = `请为技能树展开 ${nextStage ? '下一阶段' : '更多'} 的节点。`;

  return { system, user };
}
