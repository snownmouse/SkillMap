# Prompt Design Guide - 提示词设计指南

本文档描述 SkillMap 项目中提示词的设计理念、理论框架和设计规范。

## 1. 设计理念

SkillMap 的提示词设计遵循三大核心理念：

### 1.1 循证设计 (Evidence-Based Design)
所有提示词都基于经过验证的教育学和心理学理论，确保 AI 的输出具有科学性和有效性。

### 1.2 理论驱动 (Theory-Driven)
每个提示词都明确引用相关理论框架，指导 AI 生成符合学习科学原理的回复。

### 1.3 用户中心 (User-Centered)
提示词设计充分考虑用户的学习体验、情感状态和个性化需求。

---

## 2. 理论框架

### 2.1 教育学理论

#### Bloom's Taxonomy（布鲁姆认知分类法）
| 层级 | 英文 | 行为表现 |
|-----|------|---------|
| L1 | 记忆 | 能说出/列出/识别基本概念 |
| L2 | 理解 | 能解释/总结/类比原理 |
| L3 | 应用 | 能示范/解决常规问题 |
| L4 | 分析 | 能对比/找出关联/诊断问题 |
| L5 | 评价 | 能判断/辩护/批判性思考 |
| L6 | 创造 | 能设计/发明/重构方案 |

**应用文件**: `checkinChat.ts`, `chatSummary.ts`, `generateTree.ts`, `learningSuggestion.ts`

#### Kolb's Learning Cycle（科尔布经验学习循环）
```
具体经验 → 反思观察 → 抽象概念化 → 主动实验
```

**应用**: `checkinChat.ts` - 引导用户完成完整的学习循环

#### Zone of Proximal Development（最近发展区）
- 任务难度应略高于用户当前水平
- 让用户"踮脚够得到"
- 提供适度挑战而非过难内容

**应用**: `checkinChat.ts`, `learningSuggestion.ts`

#### Deliberate Practice（刻意练习）
四要素：
- 专注（Focus）：明确练习目标
- 反馈（Feedback）：识别好坏
- 调整（Adjustment）：基于反馈改进
- 边界（Edge）：在能力边界挑战

**应用**: `checkinChat.ts`, `chatSummary.ts`, `learningSuggestion.ts`

#### Growth Mindset（成长型思维）
- 强调过程和努力，而非天赋
- 鼓励面对挑战和从失败中学习
- 避免"聪明"等固定型评价

**应用**: `checkinChat.ts`, `chatSummary.ts`, `learningSuggestion.ts`

#### Spaced Repetition（间隔重复）
复习间隔遵循遗忘曲线：
```
1天 → 3天 → 7天 → 14天 → 30天
```

**应用**: `learningSuggestion.ts`

#### Self-Determination Theory（自我决定理论）
三要素：
- 自主性：给用户选择权
- 胜任感：难度适中，体验成功
- 归属感：强调学习社群价值

**应用**: `chatSummary.ts`, `learningSuggestion.ts`

#### Cognitive Load Theory（认知负荷理论）
- 控制单次学习量
- 避免信息过载
- 利用已有知识降低新知识负荷

**应用**: `generateTree.ts`, `learningSuggestion.ts`

#### Constructivism（建构主义）
新知识需与已有知识建立联系，形成知识网络。

**应用**: `generateTree.ts`

#### Connectivism（连接主义）
学习是形成网络的过程：节点 + 连接。

**应用**: `generateTree.ts` - 技能树结构设计

#### Andragogy（成人学习理论）
成人学习六大原则：
1. 自我导向
2. 经验基础
3. 问题中心
4. 目标导向
5. 立即应用
6. 内在动机

**应用**: 所有提示词

#### Mastery Learning（掌握学习）
确保真正掌握才进入下一阶段：
- minimum（合格线）：基本掌握标准
- proficient（熟练）：熟练掌握标准
- mastery（精通）：精通掌握标准
- unlockThreshold：解锁后续节点的前置条件

**应用**: `generateTree.ts`

#### Goal Gradient Effect（目标梯度）
越接近目标越有动力：
- milestone 描述让人感觉快要成功
- 难度递增平缓，避免后期突增
- 中后期安排"快速胜利"节点

**应用**: `generateTree.ts`

---

### 2.2 职业规划理论

#### Holland Code（霍兰德职业兴趣理论）
| 代码 | 类型 | 特征 |
|-----|------|-----|
| R | 实用型 | 动手操作、工具使用 |
| I | 研究型 | 分析思考、解决问题 |
| A | 艺术型 | 创意表达、自我表现 |
| S | 社会型 | 帮助他人、沟通协作 |
| E | 企业型 | 领导影响、说服他人 |
| C | 常规型 | 组织数据、精确细致 |

**应用**: `careerPlan.ts`

#### Career Anchors（职业锚理论）
| 职业锚 | 描述 |
|-------|------|
| 技术/职能 | 追求专业深度 |
| 管理 | 追求领导权力 |
| 自主/独立 | 追求自由独立 |
| 安全稳定 | 追求稳定可预期 |
| 创业精神 | 追求创新创造 |
| 服务/使命 | 追求社会价值 |
| 生活平衡 | 追求工作生活平衡 |
| 纯粹挑战 | 追求高难度挑战 |

**应用**: `careerPlan.ts`

#### SMART Goals
- Specific（具体）
- Measurable（可测量）
- Achievable（可达成）
- Relevant（相关）
- Time-bound（有时限）

**应用**: `careerPlan.ts`, `generateTree.ts`, `learningSuggestion.ts`

---

### 2.3 工程学/目标管理理论

#### OKR（目标与关键结果）
- O：鼓舞人心的目标
- KR：可量化的关键结果

**应用**: `generateTree.ts`, `learningSuggestion.ts`

#### PDCA 循环（戴明环）
```
Plan（计划）→ Do（执行）→ Check（检查）→ Act（改进）
```

**应用**: `checkinChat.ts`, `learningSuggestion.ts`

#### Pareto Principle（二八法则）
80% 的成果来自 20% 的关键努力。

**应用**: `generateTree.ts`, `careerPlan.ts`

#### Flow Theory（心流理论）
```
太难 → 焦虑
太简单 → 无聊
适度挑战 → 心流状态
```

**应用**: `learningSuggestion.ts`

#### Eisenhower Matrix（艾森豪威尔矩阵）
任务优先级四象限：
- 重要且紧急 → 立即执行
- 重要不紧急 → 计划执行
- 紧急不重要 → 委托他人
- 不重要不紧急 → 取消或忽略

**应用**: `learningSuggestion.ts`

#### Capability Maturity Model（能力成熟度模型）
| 等级 | 描述 |
|-----|------|
| L1 | 初始级：凭感觉 |
| L2 | 可重复：形成习惯 |
| L3 | 已定义：标准化流程 |
| L4 | 管理级：量化控制 |
| L5 | 优化级：持续改进 |

**应用**: `chatSummary.ts`

---

## 3. 提示词文件清单

| 文件 | 用途 | 核心理论 |
|-----|------|---------|
| `generateTree.ts` | 技能树生成 | Bloom's, Constructivism, Connectivism, OKR, Cognitive Load, Pareto, Deliberate Practice, **Mastery Learning**, **Goal Gradient** |
| `checkinChat.ts` | 节点对话复盘 | Bloom's, Kolb, Growth Mindset, Deliberate Practice, ZPD, PDCA |
| `careerPlan.ts` | 职业路径规划 | Holland Code, Career Anchors, SMART, Pareto, Transferable Skills |
| `learningSuggestion.ts` | 学习建议生成 | OKR, ZPD, PDCA, Spaced Repetition, SDT, Cognitive Load, Flow, **Eisenhower Matrix** |
| `chatSummary.ts` | 对话摘要分析 | Bloom's, SDT, Growth Mindset, Kolb, Deliberate Practice, CMM |

---

## 4. 设计规范

### 4.1 结构规范

每个提示词必须包含以下部分：

```
## 用户信息/上下文
- 清晰的用户画像

## 理论框架
- 引用 1-3 个核心理论
- 解释理论如何应用

## 对话策略/设计原则
- 具体的操作指导

## 输出格式
- 严格的 JSON Schema
- 字段说明

## 约束
- 长度限制
- 内容限制
- 质量要求
```

### 4.2 输出格式规范

#### JSON 字段命名
- 使用 camelCase 命名法
- 字段名需具有描述性
- 避免过于简短的命名

#### 必填字段标记
```
"fieldName": "string（必填）",
"optionalField": "string（可选）"
```

#### 枚举值约束
```
"status": "locked|available|completed",
"priority": "high|medium|low"
```

### 4.3 理论引用规范

- 首次引用理论时给出完整名称和简介
- 使用表格或列表清晰展示理论要素
- 明确说明理论如何转化为具体操作

### 4.4 语言规范

- 使用中文描述（项目主要语言）
- 理论名称保留英文
- 避免歧义性表达

---

## 5. 提示词优化 Checklist

在提交新的提示词或修改现有提示词时，确保：

- [ ] 引用了适当的理论框架
- [ ] 理论有具体的应用说明
- [ ] 输出格式有明确的 JSON Schema
- [ ] 约束条件清晰可执行
- [ ] 长度限制合理
- [ ] 测试过多种输入场景
- [ ] 更新了本文档的相关章节

---

## 6. 版本历史

| 版本 | 日期 | 修改内容 |
|-----|------|---------|
| 1.0 | 2026-05-02 | 初始版本，融入教育学和职业规划理论框架 |

---

## 7. 参考资源

### 教育学
- Bloom's Taxonomy: https://bloomspens taxonomy.org/
- Kolb's Learning Styles: https://www.learning-styles-online.com/
- Zone of Proximal Development: Vygotsky, 1978
- Deliberate Practice: Ericsson, 2006
- Growth Mindset: Dweck, 2006
- Self-Determination Theory: Deci & Ryan, 2000

### 职业规划
- Holland Code: Holland, 1973
- Career Anchors: Schein, 1978
- SMART Goals: Doran, 1981

### 工程管理
- OKR: Doerr, 2018
- PDCA: Deming, 1986
- Pareto Principle: Juran, 1951
