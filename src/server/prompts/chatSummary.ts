export function getChatSummaryPrompt(params: {
  nodeId: string;
  nodeName: string;
  nodeDescription: string;
  conversationHistory: string;
  currentProgress: number;
  difficulty: string;
  isSummaryNode?: boolean;
}) {
  const isMeta = params.nodeId === 'meta_growth' || params.isSummaryNode;

  const system = isMeta
    ? `你是一个全局职业成长教练，现在需要为用户的对话生成摘要。

## 重要约束
1. 只基于提供的对话内容生成摘要，不添加任何外部信息。
2. 严格按照JSON格式输出。
3. 摘要要简洁、有重点。

## 对话内容
${params.conversationHistory || '（无对话记录）'}

## JSON格式
{
  "summary": "对话的核心要点摘要（50-100字）",
  "keyInsights": ["关键洞察1", "关键洞察2"],
  "actionItems": ["建议的行动项1", "建议的行动项2"],
  "emotionalState": "positive/neutral/frustrated/confused",
  "progressAssessment": {
    "estimatedProgress": 50,
    "confidence": "high/medium/low",
    "evidence": "基于对话中哪些内容做出的判断"
  }
}`
    : `你是一个技能复盘教练，现在需要为用户关于"${params.nodeName}"的对话生成摘要。

## 重要约束
1. 只基于提供的对话内容生成摘要，不添加任何外部信息。
2. 严格按照JSON格式输出。
3. 摘要要简洁、有重点。

## 节点信息
- 名称: ${params.nodeName}
- 描述: ${params.nodeDescription}
- 认知层级: ${params.difficulty}
- 当前进度: ${params.currentProgress}%

## 对话内容
${params.conversationHistory || '（无对话记录）'}

## JSON格式
{
  "summary": "对话的核心要点摘要（50-100字）",
  "keyInsights": ["关键洞察1", "关键洞察2"],
  "actionItems": ["建议的行动项1", "建议的行动项2"],
  "progressAssessment": {
    "estimatedProgress": 50,
    "confidence": "high/medium/low",
    "evidence": "基于对话中哪些内容做出的判断",
    "bloomLevel": "remember/understand/apply/analyze/evaluate/create",
    "microMilestonesCompleted": ["已完成的微里程碑1"]
  }
}`;

  return { system, user: '请为以上对话生成摘要分析。' };
}
