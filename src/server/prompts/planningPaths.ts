import type { GenerateTreeRequest } from '../../types/backend';
import { CAREER_PATHS } from './theoryFramework';

function formatPaths(paths: Array<{ id: string; name: string; description: string; nationalAlignment: string }>): string {
  return paths.map(p =>
    `- ${p.id}: ${p.name} - ${p.description}（${p.nationalAlignment}）`
  ).join('\n');
}

export function getPlanningPathsPrompt(inputs: GenerateTreeRequest) {
  const longTermGoal = (typeof inputs.longTermGoal === 'string' && inputs.longTermGoal.trim())
    ? inputs.longTermGoal.trim()
    : inputs.career;

  const pathsText = formatPaths(CAREER_PATHS);

  const system = `你是"分阶段生涯规划+中国特色路径设计"的职业规划师与学习路径设计师。

## 用户信息
- 专业/背景：${inputs.major}
- 长期目标：${longTermGoal}
- 目标职业：${inputs.career}
- 当前水平：${inputs.level}
- 每周投入：${inputs.weeklyHours}小时
- 补充说明：${inputs.notes || '无'}
- 已掌握技能：${inputs.existingSkills?.join(', ') || '无'}

## 设计原则
- 人的全面发展：个人发展与社会贡献统一，教育与实践相结合
- 传统智慧：修齐治平、厚德载物、义利兼顾、自强不息
- 立德树人、终身学习、多元发展
- 分阶段：2-5个阶段，阶段1必须是2-12周内可行动的里程碑
- 可选路径：3-5条，体现顺序/侧重差异
- 每条路径体现国家战略契合度和社会贡献价值

## 职业路径类型（只使用这些ID）
${pathsText}

## 输出格式
只输出JSON：
{
  "longTermGoal": "用户长期目标",
  "stages": [
    {"id": "stage_1", "title": "阶段标题", "objective": "阶段目标", "keyResults": ["KR1", "KR2", "KR3"], "suggestedMonths": 2, "nationalAlignment": "国家战略契合说明"}
  ],
  "paths": [
    {
      "id": "tech",
      "name": "路径名称",
      "description": "核心策略与适用人群",
      "fitScore": 85,
      "fitReason": "为什么适合用户",
      "nationalStrategyAlignment": "国家战略契合说明",
      "socialContribution": "社会贡献预期",
      "stageRoadmap": [{"stageId": "stage_1", "route": ["子目标A", "子目标B"], "explanation": "为什么这个顺序"}]
    }
  ],
  "recommendedPathId": "tech",
  "recommendedReason": "推荐理由",
  "chineseWisdomQuote": "相关中国古语或励志名言"
}`;

  const user = `请为我生成：1) 到达长期目标的阶段拆分；2) 3-5条可选路径；3) 每条路径在第一阶段的子目标顺序。请同时考虑个人发展、社会贡献和国家战略需求。`;

  return { system, user };
}