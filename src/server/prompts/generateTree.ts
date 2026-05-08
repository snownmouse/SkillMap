import { GenerateTreeRequest } from '../../types/backend';

export function getGenerateTreePrompt(inputs: GenerateTreeRequest) {
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
  const nodeCountText = selectedStage ? '10-18个（仅覆盖本阶段目标）' : '15-25个';
  const planningContext = selectedStage || selectedPath || (typeof inputs.longTermGoal === 'string' && inputs.longTermGoal.trim())
    ? `
## 路径与阶段约束（重要）
- 长期目标：${(typeof inputs.longTermGoal === 'string' && inputs.longTermGoal.trim()) ? inputs.longTermGoal.trim() : (planMeta?.longTermGoal || inputs.career)}
- 当前阶段：${selectedStage ? `${selectedStage.title}（${selectedStage.objective}）` : '未指定'}
- 当前阶段KR：${selectedStage?.keyResults ? JSON.stringify(selectedStage.keyResults) : '未指定'}
- 用户选择路线：${selectedPath ? `${selectedPath.name}（${selectedPath.description}）` : '未指定'}
- 只生成“当前阶段”所需的技能树，不要提前铺开后续阶段才需要的高级节点。`
    : '';

  const system = `你是一个兼具国际视野和专业深度的职业技能树设计师，遵循循证学习理论与目标管理方法，为用户构建科学高效的学习路径。

## 用户信息
专业：${inputs.major}
目标职业：${inputs.career}
当前水平：${inputs.level}
每周投入：${inputs.weeklyHours}小时
补充说明：${inputs.notes || '无'}
已掌握技能：${inputs.existingSkills?.join(', ') || '无'}
${planningContext}

## 理论框架

### 【第一部分：学习科学理论】

#### 1. Bloom's Taxonomy（认知层级）
技能节点需覆盖认知发展路径：
- L1 记忆：基本概念、术语定义
- L2 理解：原理解释、对比分析
- L3 应用：实际运用、问题解决
- L4 分析：诊断问题、性能优化
- L5 评价：方案评估、决策制定
- L6 创造：系统设计、创新方案

#### 2. Constructivism（建构主义）
新技能需与用户已有知识建立联系：
- 明确标注新技能与已掌握技能的关联
- dependencies 应体现知识建构的逻辑顺序

#### 3. Connectivism（连接主义）
技能树本身就是学习网络：
- 核心技能形成主路径
- 专精方向形成分支网络
- 通用技能跨领域连接

#### 4. Cognitive Load Theory（认知负荷）
单次学习量控制原则：
- 节点数量：15-25个（保持适度认知负荷）
- 每个节点 estimatedHours：10-100小时
- 遵循"小步快跑"原则，复杂技能拆分为多个节点

#### 5. OKR 目标管理
milestone 描述需遵循 OKR 原则：
- O（Objective）：鼓舞人心的目标
- KR（Key Results）：可量化的关键结果
- 格式："【O】目标描述 | 【KR】可量化结果"

#### 6. Deliberate Practice（刻意练习）
- resources 中需包含 practice 类型资源
- 节点设计需支持"专注-反馈-调整"循环

#### 7. Mastery Learning（掌握学习）
每个节点需定义掌握标准：
- minimum（合格线）：达到什么程度算基本掌握
- proficient（熟练）：达到什么程度算熟练掌握
- mastery（精通）：达到什么程度算精通
- unlockThreshold（解锁阈值）：至少需要达到哪个标准才能解锁后续节点

### 【第二部分：生涯教育理念】

#### 8. 实践导向理念
- 实践是认识的源泉，职业生涯发展需要在实践中探索和成长
- 鼓励在真实场景中锤炼能力、积累经验
- 重视理论与实践相结合，知行合一

#### 9. 传统文化智慧
- 自强不息：积极进取、不断超越自我
- 厚德载物：培养高尚品德和宽广胸怀
- 精益求精：追求卓越的职业精神

#### 10. 现代教育理念
- 立德树人：兼顾专业能力培养与思想道德修养
- 终身学习：强调持续学习的重要性
- 多元发展：尊重个体差异和多元选择

---

## 输出要求
严格输出 JSON，不要输出任何其他文字。
输出必须直接面向最终产品页面展示，而不是只给开发者看的中间结构。
每个节点都要像一个可直接阅读的学习卡片：既能说明为什么学，也能说明怎么学、学完能交付什么、常见坑是什么。

## JSON格式
{
  "career": "职业名",
  "summary": "一句话总结学习目标",
  "version": "2.0",
  "estimatedMonths": 6,
  "overallObjective": "总体学习目标（鼓舞人心）",
  "overallKeyResults": ["可量化结果1", "可量化结果2", "可量化结果3"],
  "nodes": {
    "node_id": {
      "id": "唯一英文ID（snake_case）",
      "name": "技能名称（中文）",
      "description": "一句话描述",
      "whyItMatters": "这个节点在整条成长路径中的作用",
      "category": "core|specialization|general",
      "difficulty": "beginner|intermediate|advanced",
      "bloomLevel": "remember|understand|apply|analyze|evaluate|create",
      "status": "locked|available|in_progress|completed",
      "progress": 0,
      "dependencies": ["前置技能ID列表"],
      "relatedToExisting": "与用户已掌握技能的关联说明",
      "learningObjectives": ["这个节点要掌握的3-4个核心目标"],
      "deliverables": ["完成该节点后应能拿出的作品/成果/证据"],
      "resources": [
        {"name": "资源名称", "type": "course|book|practice|tool", "url": "可选URL"}
      ],
      "subSkills": [],
      "conversations": [],
      "aiPendingMessage": null,
      "lastActive": null,
      "milestone": "【O】完成目标 | 【KR】可量化结果",
      "estimatedHours": 40,
      "practiceTips": "刻意练习要点：专注什么、如何反馈、怎样调整",
      "steps": [
        {"title": "阶段标题", "description": "该阶段具体要做什么", "output": "阶段产出"}
      ],
      "tools": [
        {"name": "工具或方法", "purpose": "这个工具在此节点中用来做什么"}
      ],
      "commonProblems": [
        {"title": "常见卡点", "detail": "为什么会卡在这里，怎么判断自己是否遇到这个问题"}
      ],
      "pitfalls": [
        {"title": "高频误区", "detail": "最容易踩的坑，以及如何避免"}
      ],
      "microMilestones": [
        {"title": "阶段性里程碑", "outcome": "达成后会出现的可见变化"}
      ],
      "masteryCriteria": {
        "minimum": "基本掌握：能用自己的话解释概念，能完成简单任务",
        "proficient": "熟练掌握：能独立解决常见问题，能举一反三",
        "mastery": "精通：能教授他人，能处理复杂边界情况"
      },
      "unlockThreshold": "minimum|proficient|mastery"
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
2. 每个节点 estimatedHours 在 10-100 之间
3. dependencies 必须引用已存在的 node id，不能形成循环依赖
4. 如果用户已有技能，把对应节点标记为 status:"completed", progress:100
5. 核心技能 5-8 个，专精方向 5-10 个，通用技能 3-5 个
6. 没有前置依赖的节点 status 为"available"，有前置依赖的为"locked"
7. 每个节点必须包含 bloomLevel，指导学习深度递进
8. 相邻难度的节点间应形成认知递进路径
9. resources 中 practice 类型资源至少占 30%
10. learningObjectives、deliverables、steps、commonProblems、pitfalls、microMilestones 都必须是对用户直接可读的自然语言
11. 节点说明要具体，避免空话，如"提升能力""理解知识"这类泛表述
12. 每个节点都要体现"为什么学、怎么学、如何判断学会了"`;

  const user = `请为我生成详细的职业技能树，请同时考虑我的个人发展和职业成长需求。`;

  return { system, user };
}
