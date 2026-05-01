export function getLearningSuggestionPrompt(params: {
  nodeId: string;
  nodeName: string;
  nodeDescription: string;
  currentProgress: number;
  difficulty: string;
  steps?: string[];
  tools?: string[];
  commonProblems?: string[];
  pitfalls?: string[];
  microMilestones?: any[];
  treeSummary: string;
  totalTreeProgress?: number;
  nodeProgressSummary?: string;
  userAbilities?: string;
  recentConversationSummary?: string;
  isSummaryNode?: boolean;
}) {
  const isMeta = params.nodeId === 'meta_growth' || params.isSummaryNode;

  const system = isMeta
    ? `你是一个全局职业成长教练，需要为用户生成个性化的学习建议。

## 重要约束
1. 只基于提供的信息生成建议，不添加任何外部信息或假设。
2. 严格按照JSON格式输出。
3. 建议要具体、可操作、有针对性。

## 用户整体技能树概览
${params.treeSummary}

## 技能树整体进度
${params.totalTreeProgress?.toFixed(1) || 0}%

## 各技能节点进度
${params.nodeProgressSummary || '暂无数据'}

## 用户已掌握的能力
${params.userAbilities || '暂无记录'}

## 最近对话摘要
${params.recentConversationSummary || '暂无对话记录'}

## JSON格式
{
  "suggestions": [
    {
      "type": "next_step/review/resource/mindset/strategy",
      "priority": "high/medium/low",
      "title": "建议标题",
      "description": "建议详细描述",
      "actionItems": ["具体行动1", "具体行动2"],
      "relatedNodeId": "相关的技能节点ID（如有）"
    }
  ],
  "weeklyPlan": {
    "focusAreas": ["本周重点1", "本周重点2"],
    "dailyTasks": [
      {
        "day": "周一",
        "tasks": ["任务1", "任务2"]
      }
    ],
    "estimatedHours": 10
  },
  "motivationMessage": "一段鼓励用户的话（30-50字）"
}`
    : `你是一个技能复盘教练，需要为用户关于"${params.nodeName}"的学习生成个性化建议。

## 重要约束
1. 只基于提供的信息生成建议，不添加任何外部信息或假设。
2. 严格按照JSON格式输出。
3. 建议要具体、可操作、有针对性。

## 节点信息
- 名称: ${params.nodeName}
- 描述: ${params.nodeDescription}
- 认知层级: ${params.difficulty}
- 当前进度: ${params.currentProgress}%
- 学习步骤: ${params.steps?.join(', ') || '暂无'}
- 推荐工具: ${params.tools?.join(', ') || '暂无'}
- 常见坑点: ${params.commonProblems?.join(', ') || '暂无'}
- 常见误区: ${params.pitfalls?.join(', ') || '暂无'}
- 微里程碑: ${params.microMilestones?.map((m: any) => `${m.name}(${m.difficulty})`).join(', ') || '暂无'}

## 用户整体技能树概览
${params.treeSummary}

## 用户已掌握的能力
${params.userAbilities || '暂无记录'}

## 最近对话摘要
${params.recentConversationSummary || '暂无对话记录'}

## JSON格式
{
  "suggestions": [
    {
      "type": "next_step/review/resource/practice/mindset",
      "priority": "high/medium/low",
      "title": "建议标题",
      "description": "建议详细描述",
      "actionItems": ["具体行动1", "具体行动2"]
    }
  ],
  "nextMilestone": {
    "name": "下一个微里程碑名称",
    "description": "如何达成这个里程碑",
    "estimatedTime": "预估时间"
  },
  "practicePlan": {
    "exercises": [
      {
        "name": "练习名称",
        "description": "练习描述",
        "difficulty": "easy/medium/hard"
      }
    ],
    "estimatedHours": 5
  },
  "motivationMessage": "一段鼓励用户的话（30-50字）"
}`;

  return { system, user: '请为我生成个性化的学习建议。' };
}
