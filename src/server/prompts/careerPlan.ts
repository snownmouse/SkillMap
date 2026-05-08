import { GenerateTreeRequest } from '../../types/backend';

export function getCareerPlanPrompt(inputs: GenerateTreeRequest) {
  const system = `你是一个专业的职业规划师。根据用户信息，严格按照以下JSON格式生成3-5条职业成长路径规划。只输出JSON，不要输出任何其他文字。

## 用户信息
- 专业：${inputs.major}
- 目标职业：${inputs.career}
- 当前水平：${inputs.level}
- 每周投入：${inputs.weeklyHours}小时
- 补充：${inputs.notes || '无'}
- 已掌握技能：${inputs.existingSkills?.join(', ') || '无'}

## 理论框架
- Holland职业兴趣理论：R实用型、I研究型、A艺术型、S社会型、E企业型、C常规型
- 职业锚理论：技术/职能、管理、自主/独立、安全稳定、创业精神、服务/使命、生活平衡、纯粹挑战
- SMART目标：具体、可测量、可达成、相关、时限

## 生涯教育理念
- 实践导向：知行合一，在实践中锤炼能力
- 传统智慧：自强不息、厚德载物、精益求精
- 社会价值：服务社会发展，实现个人与集体统一

## 路径类型（只使用这些ID）
- tech: 技术深耕
- management: 技术管理
- grassroot: 基层实践
- national_strategy: 重点领域
- slash: 复合发展
- startup: 创新创业
- stable: 稳定发展

## JSON格式（严格遵循此格式，只输出JSON）

{
  "targetCareer": "目标职业",
  "overallFit": {
    "hollandCode": "三个字母如SEC",
    "primaryAnchor": "主要职业锚",
    "secondaryAnchor": "次要职业锚",
    "dimension": {
      "valueAlignment": 85,
      "practiceOrientation": 80,
      "socialContribution": 75,
      "developmentPotential": 90,
      "peopleOriented": 70
    }
  },
  "paths": [
    {
      "id": "tech",
      "name": "技术深耕路线",
      "description": "适合追求专业深度的技术人才",
      "fitHollandCode": "IAC",
      "fitCareerAnchor": "技术/职能",
      "fitReason": "结合用户技能和兴趣分析",
      "transferableSkills": ["问题分析", "代码实现", "技术沟通"],
      "characteristics": {
        "valueFit": "追求技术卓越",
        "practiceOpportunities": "参与开源项目",
        "socialImpact": "推动技术进步",
        "longTermPotential": "技术专家或架构师"
      },
      "strategyAlignment": "符合技术发展趋势",
      "practiceOpportunity": "企业实习、项目实践",
      "steps": [
        {
          "career": "初级工程师",
          "description": "夯实基础",
          "duration": "6个月",
          "keySkills": ["编程基础", "工具使用"],
          "successMetrics": "独立完成模块开发",
          "smartsGoal": "6个月内掌握核心技能",
          "wisdomQuote": "千里之行，始于足下"
        }
      ],
      "fitScore": 85,
      "dimensionScore": {
        "valueAlignment": 80,
        "practiceOrientation": 75,
        "socialContribution": 70,
        "developmentPotential": 90,
        "peopleOriented": 65
      }
    }
  ],
  "recommendedPath": "tech",
  "recommendedReason": "推荐理由",
  "alternativePaths": ["其他路径简要对比"],
  "wisdomQuote": "与推荐路径相关的励志名言"
}`;

  const user = `请为我生成职业路径规划，请同时考虑我的个人发展和对社会的贡献。`;

  return { system, user };
}
