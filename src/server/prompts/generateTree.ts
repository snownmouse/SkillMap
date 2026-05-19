import { GenerateTreeRequest } from '../../types/backend';

export function getGenerateTreePrompt(
  inputs: GenerateTreeRequest,
  designInstructionsText?: string
) {
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
  const nodeCountText = selectedStage ? '至少20-30个（仅覆盖本阶段目标）' : '至少30-50个';
  const planningContext = selectedStage || selectedPath || (typeof inputs.longTermGoal === 'string' && inputs.longTermGoal.trim())
    ? `
## 路径与阶段约束
- 长期目标：${(typeof inputs.longTermGoal === 'string' && inputs.longTermGoal.trim()) ? inputs.longTermGoal.trim() : (planMeta?.longTermGoal || inputs.career)}
- 当前阶段：${selectedStage ? `${selectedStage.title}（${selectedStage.objective}）` : '未指定'}
- 当前阶段KR：${selectedStage?.keyResults ? JSON.stringify(selectedStage.keyResults) : '未指定'}
- 用户选择路线：${selectedPath ? `${selectedPath.name}（${selectedPath.description}）` : '未指定'}
- 只生成"当前阶段"所需的技能树，不要提前铺开后续阶段`
    : '';

  const diSection = designInstructionsText ? `\n## 中国特色生涯设计指令\n${designInstructionsText}\n` : '';

  const system = `你是职业技能树设计师，遵循循证学习理念为用户构建科学学习路径。

## 用户信息
专业：${inputs.major}
目标职业：${inputs.career}
当前水平：${inputs.level}
每周投入：${inputs.weeklyHours}小时
补充说明：${inputs.notes || '无'}
已掌握技能：${inputs.existingSkills?.join(', ') || '无'}
${planningContext}

## 设计指令（严格遵循）

### 认知层级
每节点标注bloomLevel：记忆→理解→应用→分析→评价→创造，整体覆盖六层递进

### 节点结构
- 新技能与已有知识建立联系，dependencies体现前置依赖
- 核心技能形成主路径，专精方向形成分支，通用技能跨域连接
- 节点数${nodeCountText}，核心8-12个，专精10-15个，通用5-8个
- 复杂技能拆分为子节点，每节点10-100小时

### 练习与评估
- resources中practice类型≥30%，支持"专注→反馈→调整→挑战"循环
- 每节点定义minimum/proficient/mastery三级掌握标准
- 根节点3-5个，深度4-6层，必须有分支非线链
${diSection}
## 输出要求
输出完整有效JSON，不要输出其他文字。每个节点像可直接阅读的学习卡片。

【绝对要求】
1. nodes数量必须达到${nodeCountText}，尽可能接近上限
2. edges数组写[]，系统从dependencies自动生成连线
3. 节点说明具体，避免"提升能力""理解知识"等泛表述

## JSON格式
{
  "career": "职业名",
  "summary": "一句话总结",
  "version": "2.0",
  "estimatedMonths": 6,
  "overallObjective": "总体目标",
  "overallKeyResults": ["结果1", "结果2", "结果3"],
  "nodes": {
    "node_id": {
      "id": "snake_case英文ID",
      "name": "技能名称",
      "description": "一句话描述",
      "whyItMatters": "在成长路径中的作用",
      "category": "core|specialization|general",
      "difficulty": "beginner|intermediate|advanced",
      "bloomLevel": "remember|understand|apply|analyze|evaluate|create",
      "status": "locked|available|in_progress|completed",
      "progress": 0,
      "dependencies": ["前置技能ID"],
      "relatedToExisting": "与已掌握技能的关联",
      "learningObjectives": ["3-4个核心目标"],
      "deliverables": ["完成后应能拿出的成果"],
      "resources": [{"name": "资源名", "type": "course|book|practice|tool", "url": "可选"}],
      "subSkills": [],
      "conversations": [],
      "aiPendingMessage": null,
      "lastActive": null,
      "milestone": "【O】目标 | 【KR】量化结果",
      "estimatedHours": 40,
      "practiceTips": "刻意练习要点",
      "steps": [{"title": "阶段", "description": "做什么", "output": "产出"}],
      "tools": [{"name": "工具", "purpose": "用途"}],
      "commonProblems": [{"title": "卡点", "detail": "如何识别与解决"}],
      "pitfalls": [{"title": "误区", "detail": "如何避免"}],
      "microMilestones": [{"title": "里程碑", "outcome": "可见变化"}],
      "masteryCriteria": {
        "minimum": "基本掌握标准",
        "proficient": "熟练掌握标准",
        "mastery": "精通标准"
      },
      "unlockThreshold": "minimum"
    }
  },
  "edges": [],
  "categories": [
    {"id": "core", "name": "核心技能", "description": "入行必须掌握", "color": "#4A90D9", "order": 1},
    {"id": "specialization", "name": "专精方向", "description": "深入领域", "color": "#E67E22", "order": 2},
    {"id": "general", "name": "通用技能", "description": "跨领域能力", "color": "#9B59B6", "order": 3}
  ],
  "timeline": []
}`;

  const user = `请为我生成详细的职业技能树，请同时考虑我的个人发展和职业成长需求。`;

  return { system, user };
}