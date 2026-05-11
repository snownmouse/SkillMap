# 中国特色生涯规划自主知识体系设计稿

## 版本：v3.0

### 背景与目标

本文档基于《中国特色生涯教育自主知识体系建构》论文的理论框架，结合项目原有西方生涯教育理论（霍兰德职业兴趣理论、职业锚理论、SMART目标等），设计一套**中西融合的中国特色生涯规划体系**。

---

## 一、理论框架重构

### 1.1 双层理论体系架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      中国特色生涯规划体系                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────┐     ┌───────────────────────────┐  │
│  │     第一层：模型内部理论（数据处理）    │     │   第二层：用户展示理论      │  │
│  ├─────────────────────────────────┤     │   （面向用户的理论解释）     │  │
│  │ • Holland Code 匹配算法          │     ├───────────────────────────┤  │
│  │ • Career Anchors 分类逻辑         │     │ • 理论名称与核心观点        │  │
│  │ • Bloom's Taxonomy 认知层级计算   │     │ • 理论在个人发展中的应用     │  │
│  │ • 中国特色维度加权算法            │     │ • 通俗解释与实际案例         │  │
│  │ • 路径匹配评分模型                │     │ • 用户可理解的评估维度       │  │
│  └─────────────────────────────────┘     └───────────────────────────┘  │
│                                                                         │
│  核心原则：数据处理理论（精确计算） ≠ 用户展示理论（通俗解释）              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 原有西方理论保留

| 理论ID | 理论名称 | 核心价值 | 应用场景 |
|--------|---------|---------|---------|
| holland | Holland Code（霍兰德） | 职业兴趣匹配 | 职业推荐、路径匹配 |
| career_anchors | Career Anchors（职业锚） | 职业价值取向 | 自我认知、职业定位 |
| smart | SMART Goals | 目标设定方法 | 目标制定、计划执行 |
| bloom | Bloom's Taxonomy | 认知层级递进 | 学习路径设计、能力评估 |
| deliberate_practice | Deliberate Practice | 刻意练习 | 技能训练、学习方法 |
| zpd | Zone of Proximal Development | 最近发展区 | 任务难度设计、推荐 |

### 1.3 中国特色理论融入

#### 核心理论支柱

**① 马克思主义人的全面发展理论**
- 人的本质是社会关系的总和
- 人的自由而全面的发展
- 教育与生产劳动相结合
- 实践是认识的源泉

**② 中华优秀传统文化精华**
- 修齐治平、兴亡有责的家国情怀
- 富民厚生、义利兼顾的经济伦理
- 厚德载物、明德弘道的精神追求
- 自强不息、精益求精的奋斗精神

**③ 中国特色社会主义教育理论**
- 立德树人、为党育人、为国育才
- 理论联系实际、密切联系群众
- 德智体美劳全面发展

### 1.4 中西融合的理论模型

```
┌─────────────────────────────────────────────────────────────┐
│                    中国特色生涯规划体系                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │  个人维度    │    │  社会维度    │    │  国家维度    │    │
│  │  (西方理论)  │ +  │  (中西结合)  │ +  │  (中国特色)  │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
│  • 兴趣匹配      • 社会责任          • 国家战略需求          │
│  • 能力评估      • 职业道德          • 区域协调发展          │
│  • 价值取向      • 义利兼顾          • 基层锻炼              │
│  • 目标设定      • 家国情怀          • 民族复兴              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、评估维度体系

### 2.1 维度分类架构

| 维度类型 | 维度ID | 维度名称 | 理论来源 | 评估内容 |
|---------|--------|---------|---------|---------|
| 西方维度 | holland_match | 霍兰德匹配度 | Holland Code | 职业兴趣匹配 |
| 西方维度 | career_anchor_match | 职业锚匹配度 | Career Anchors | 价值观契合 |
| 中国特色 | jia_guo_qing_huai | 家国情怀 | 中华传统文化 | 服务国家意愿 |
| 中国特色 | yi_li_jian_gu | 义利兼顾 | 中华传统文化 | 利益与责任平衡 |
| 中国特色 | ming_de_hong_dao | 明德弘道 | 中华传统文化 | 职业道德修养 |
| 中国特色 | shi_jian_zhi_xiang | 实践志向 | 马克思主义 | 基层实践意愿 |
| 综合维度 | national_demand | 国家战略需求 | 社会主义教育 | 战略契合度 |
| 综合维度 | social_contribution | 社会贡献预期 | 马克思主义 | 贡献价值 |

### 2.2 维度解释体系

每个维度包含三级解释：

```typescript
interface DimensionInterpretation {
  low: string;    // 低分（0-33）解释
  medium: string; // 中分（34-66）解释
  high: string;   // 高分（67-100）解释
}
```

---

## 三、职业路径设计重构

### 3.1 路径定义

| 路径ID | 路径名称 | 核心原则 | 国家战略契合 |
|--------|---------|---------|-------------|
| tech | 技术深耕路线 | 专业精进、技术创新 | 科技自立自强 |
| management | 管理发展路线 | 团队协作、战略规划 | 高素质管理人才 |
| slash | 复合发展路线 | 跨界融合、多元能力 | 复合型人才 |
| grassroot | 基层锻炼路线 | 扎根基层、服务群众 | 乡村振兴 |
| national_strategy | 国家战略路线 | 战略聚焦、科技攻关 | 重点领域突破 |
| startup | 创新创业路线 | 创新思维、风险承担 | 大众创业 |
| stable | 稳定发展路线 | 稳健可靠、服务民生 | 公共服务 |

### 3.2 路径匹配算法

每条路径采用加权评分模型：

```typescript
interface PathDimensionWeights {
  holland_match: number;        // 权重 0-100
  career_anchor_match: number;  // 权重 0-100
  jia_guo_qing_huai: number;    // 权重 0-100
  yi_li_jian_gu: number;        // 权重 0-100
  ming_de_hong_dao: number;     // 权重 0-100
  shi_jian_zhi_xiang: number;   // 权重 0-100
  national_demand: number;      // 权重 0-100
  social_contribution: number;  // 权重 0-100
}
```

### 3.3 路径匹配维度

```
PathEvaluation {
  personalMatch: number;      // 个人兴趣/能力匹配度 (0-100)
  skillTransfer: number;      // 可迁移技能积累度 (0-100)
  socialValue: number;       // 社会价值贡献度 (0-100)
  nationalDemand: number;     // 国家战略需求度 (0-100)
  culturalAlignment: number; // 文化价值契合度 (0-100)
}
```

---

## 四、目标设定重构

### 4.1 SMART目标 + 中国特色

原有SMART目标体系保持，增加以下维度：

| 维度 | 说明 | 问题示例 |
|------|------|---------|
| **人民性** (Mínshēnxìng) | 服务人民群众的切实需求 | 这个目标如何解决人民群众的实际问题？ |
| **时代性** (Shídài xìng) | 与国家发展同频共振 | 这个目标如何响应时代号召？ |
| **实践性** (Shíjiàn xìng) | 理论联系实际，基层实践 | 如何在实践中检验和实现这个目标？ |

### 4.2 目标分级

```
GoalLevel {
  personal: "个人发展目标"    // 个人技能提升、职业晋升
  social: "社会责任目标"      // 服务社会、帮助他人
  national: "国家贡献目标"     // 响应国家战略、投身重点领域
}
```

---

## 五、评估体系重构

### 5.1 CareerFitScore 结构

```typescript
interface CareerFitScore {
  // 西方理论维度
  hollandMatch: number;           // 霍兰德兴趣匹配度 0-100
  careerAnchorMatch: number;      // 职业锚匹配度 0-100
  
  // 中国特色维度
  chineseDimension: {
    jiaGuoQingHuai: number;      // 家国情怀指数
    yiLiJianGu: number;          // 义利兼顾指数
    mingDeHongDao: number;       // 明德弘道指数
    shiJianZhiXiang: number;     // 实践志向指数
  };
  
  // 综合维度
  nationalDemand: number;         // 国家战略需求匹配度
  socialContribution: number;     // 社会贡献预期
  culturalHeritage: number;       // 文化传承价值
  grassrootWillingness: number;   // 基层锻炼意愿
  
  // 综合推荐指数
  finalScore: number;             // 综合推荐指数
}
```

### 5.2 评估问题库

| 问题ID | 问题内容 | 关联维度 |
|--------|---------|---------|
| grassroot_willingness | 你愿意到基层去锻炼吗？为什么？ | shi_jian_zhi_xiang |
| social_value | 你如何看待个人利益与社会责任的关系？ | yi_li_jian_gu |
| national_alignment | 你的职业选择如何与国家发展同频共振？ | jia_guo_qing_huai |
| ethical_standards | 在职业发展中，你认为最重要的职业道德是什么？ | ming_de_hong_dao |
| practice_importance | 理论学习与实践锻炼，你更看重哪一个？ | shi_jian_zhi_xiang |
| social_impact | 你希望通过职业为社会做出怎样的贡献？ | social_contribution |

---

## 六、JSON响应格式重构

### 6.1 职业规划响应

```json
{
  "targetCareer": "目标职业名称",
  "overallFit": {
    "hollandCode": "推断的用户 Holland Code",
    "primaryAnchor": "主要职业锚",
    "secondaryAnchor": "次要职业锚",
    "chineseDimension": {
      "jiaGuoQingHuai": 85,
      "yiLiJianGu": 80,
      "mingDeHongDao": 75,
      "shiJianZhiXiang": 90
    },
    "nationalDemand": 88,
    "socialContribution": 82,
    "finalScore": 85
  },
  "paths": [
    {
      "id": "tech",
      "name": "技术深耕路线",
      "description": "适合追求专业深度的技术人才",
      "fitScore": 85,
      "dimensionWeights": {
        "jiaGuoQingHuai": 60,
        "yiLiJianGu": 70,
        "mingDeHongDao": 75,
        "shiJianZhiXiang": 65,
        "nationalDemand": 70,
        "socialContribution": 60
      },
      "nationalStrategyAlignment": "人工智能、芯片等国家重点领域",
      "grassrootOpportunity": "国家重点实验室、研究院等",
      "steps": [
        {
          "career": "初级工程师",
          "description": "夯实基础",
          "duration": "6个月",
          "keySkills": ["编程基础", "工具使用"],
          "wisdomQuote": "千里之行，始于足下"
        }
      ]
    }
  ],
  "recommendedPath": "tech",
  "recommendedReason": "推荐理由",
  "chineseWisdomQuote": "与推荐路径相关的古语或语录"
}
```

---

## 七、实施计划

### 7.1 第一阶段：理论框架重构
- [x] 创建统一的理论框架定义文件 (`theoryFramework.ts`)
- [x] 更新类型定义以匹配新框架
- [ ] 更新设计文档

### 7.2 第二阶段：提示词重构
- [ ] 重构 `careerPlan.ts`，融入中国特色理论框架
- [ ] 更新 `planningPaths.ts`，使用统一维度定义
- [ ] 创建提示词模板引擎

### 7.3 第三阶段：逻辑层重构
- [ ] 更新 `GrowthPathPlanner.ts`，支持新维度权重
- [ ] 更新 `careerController.ts`，使用新的响应格式

### 7.4 第四阶段：数据层适配
- [ ] 扩展类型定义
- [ ] 前端适配新数据格式

---

## 八、核心设计原则

1. **中体西用**：以中国特色理论为主体框架，融合西方科学方法
2. **知行合一**：理论指导与实践锻炼并重
3. **家国同构**：个人发展与国家命运紧密相连
4. **义利兼顾**：正当利益追求与社会责任统一
5. **与时俱进**：响应国家发展战略，顺应时代需求
6. **双层分离**：模型内部理论与用户展示理论适当分离

---

## 九、参考理论来源

1. 马克思主义思想精髓（唯物史观、人的全面发展）
2. 中华优秀传统文化（修齐治平、兴亡有责、富民厚生、厚德载物）
3. 习近平总书记关于青年就业的重要论述
4. 西方生涯教育理论（Holland、Career Anchors、Bloom's Taxonomy）
5. 《中国特色生涯教育自主知识体系建构》论文

---

*文档版本：v3.0*
*创建日期：2026-05-10*
*基于论文：中国特色生涯教育自主知识体系建构*