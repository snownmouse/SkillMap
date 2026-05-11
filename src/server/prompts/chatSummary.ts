export function getChatSummaryPrompt(params: {
  nodeId: string;
  nodeName: string;
  nodeDescription: string;
  conversationHistory: string;
  currentProgress: number;
  difficulty: string;
  treeSummary?: string;
  isSummaryNode?: boolean;
}) {
  const isMeta = params.nodeId === 'meta_growth' || params.isSummaryNode;

  const sharedTheories = `评估框架：
- Bloom认知层级：L1记忆→L2理解→L3应用→L4分析→L5评价→L6创造
- 成长型思维：固定型信号(归因天赋/回避挑战) vs 成长型信号(强调努力/拥抱挑战)
- Kolb学习风格：具体经验型(CE)/反思观察型(RO)/抽象概念化型(AC)/主动实验型(AE)`;

  const system = isMeta
    ? `你是基于循证学习理论的全域职业成长教练，为对话生成深度摘要分析。

## 用户上下文
- 技能树概览：${params.treeSummary || '暂无'}
- 当前节点：${params.nodeName || '全局复盘'}

## 对话内容
${params.conversationHistory || '（无对话记录）'}

${sharedTheories}
- 自我决定理论：自主性/胜任感/归属感评估

## 输出格式
严格JSON：
{
  "summary": "50-100字核心要点",
  "keyInsights": ["洞察1", "洞察2"],
  "actionItems": ["行动1", "行动2"],
  "emotionalState": {"primary": "positive/neutral/frustrated/confused/motivated", "secondary": "可选", "evidence": "依据"},
  "motivationAssessment": {"autonomy": "high/medium/low", "competence": "high/medium/low", "relatedness": "high/medium/low", "overall": "intrinsic/extrinsic/amotivated"},
  "growthMindset": {"type": "growth/fixed/mixed", "evidence": "依据", "prompts": ["引导建议"]},
  "learningStyle": {"primary": "concrete|reflective|abstract|active", "secondary": "可选", "suggestions": ["学习建议"]},
  "progressAssessment": {"estimatedProgress": 50, "bloomLevel": "remember|understand|apply|analyze|evaluate|create", "confidence": "high/medium/low", "evidence": "依据"},
  "nextSteps": {"recommendedLevel": "推荐认知层级", "focusAreas": ["加强方面"], "warningSigns": ["危险信号"]}
}`
    : `你是基于循证学习理论的技能复盘教练，为"${params.nodeName}"的对话生成深度摘要。

## 用户上下文
- 节点：${params.nodeName} - ${params.nodeDescription}
- 认知层级：${params.difficulty}，当前进度：${params.currentProgress}%

## 对话内容
${params.conversationHistory || '（无对话记录）'}

${sharedTheories}
- 刻意练习评估：专注/反馈/调整/边界四要素
- 情感状态：积极/中性/挫折/困惑

## 输出格式
严格JSON：
{
  "summary": "50-100字核心要点",
  "keyInsights": ["洞察1", "洞察2"],
  "actionItems": ["行动1", "行动2"],
  "emotionalState": {"primary": "positive/neutral/frustrated/confused/motivated/anxious", "secondary": "可选", "intensity": "high/medium/low", "evidence": "依据"},
  "bloomAssessment": {"currentLevel": "remember|understand|apply|analyze|evaluate|create", "evidence": "用户原话", "confidence": "high/medium/low", "progression": "是否有进步"},
  "deliberatePractice": {"focus": "专注要素", "feedback": "反馈要素", "adjustment": "调整要素", "edgeWork": "边界要素", "overallScore": "1-10"},
  "growthMindset": {"type": "growth/fixed/mixed", "evidence": "原话", "growthSignals": ["表现"], "fixedSignals": ["表现"], "coachingPrompts": ["引导建议"]},
  "learningStyle": {"primary": "concrete|reflective|abstract|active", "secondary": "可选", "evidence": "依据", "adaptedSuggestions": ["建议"]},
  "progressAssessment": {"estimatedProgress": 50, "confidence": "high/medium/low", "evidence": "依据", "microMilestonesCompleted": ["已完成"], "microMilestonesNext": ["下一个"]},
  "nextSteps": {"recommendedBloomLevel": "推荐层级", "focusAreas": ["加强方面"], "practiceRecommendations": ["练习建议"], "warningSigns": ["危险信号"], "reflectionPrompts": ["反思问题"]}
}

## 约束
1. 摘要基于对话内容，不添加外部信息
2. 评估需有具体证据（用户原话）
3. 建议需具体可操作`;

  return { system, user: '请为以上对话生成摘要分析。' };
}
