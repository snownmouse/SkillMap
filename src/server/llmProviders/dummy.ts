import { LLMMessage, LLMResponse } from "../../types/backend";
import { ILLMProvider, LLMStreamCallbacks } from "./base";

/**
 * 模拟 LLM 供应商 (Dummy API)
 * 用于在没有 API Key 的情况下测试前端流程
 */
export class DummyProvider implements ILLMProvider {
  getName(): string {
    return 'dummy';
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1500));

    const lastMessage = messages[messages.length - 1].content;
    const isGenerateTree = lastMessage.includes('生成技能树') || messages[0].content.includes('职业技能树设计师');

    let content = "";

    if (isGenerateTree) {
      // 模拟生成技能树的 JSON
      content = JSON.stringify({
        version: "1.0",
        career: "全栈开发工程师 (模拟)",
        summary: "从零开始掌握现代全栈开发技术栈。",
        estimated_months: 8,
        okr_overall: {
          objective: "建立可展示、可复盘、可持续进阶的全栈开发能力",
          keyResults: [
            "完成 2 个可上线的全栈项目",
            "能独立完成前后端联调与部署",
            "形成自己的项目作品集与复盘记录"
          ]
        },
        generatedAt: new Date().toISOString(),
        nodes: {
          "frontend_basics": {
            "id": "frontend_basics",
            "name": "前端基础",
            "description": "掌握 HTML5, CSS3 和基础 JavaScript。",
            "whyItMatters": "这是后续 React、工程化和交互设计的地基，决定你能否独立完成页面开发。",
            "category": "core",
            "difficulty": "beginner",
            "bloomLevel": "understand",
            "status": "available",
            "progress": 0,
            "dependencies": [],
            "relatedToExisting": "如果你已有编程基础，这一节点会帮助你把抽象逻辑变成可见的界面结果。",
            "resources": [{ "name": "MDN Web Docs", "type": "tool", "url": "https://developer.mozilla.org" }],
            "learningObjectives": ["理解 HTML/CSS/JS 的角色分工", "能独立写出语义化页面", "能完成基本交互逻辑"],
            "deliverables": ["一个响应式个人主页", "一个带交互的静态作品页"],
            "subSkills": [],
            "conversations": [],
            "aiPendingMessage": null,
            "practiceTips": "先聚焦布局和基础交互，每完成一个页面就回看哪里写得重复、哪里还能抽象。",
            "masteryCriteria": {
              "minimum": "能独立完成静态页面与简单 DOM 交互",
              "proficient": "能还原常见业务页面并处理常见兼容问题",
              "mastery": "能从交互稿独立拆解结构并设计可维护样式方案"
            },
            "unlockThreshold": "proficient",
            "steps": [
              { "title": "页面结构", "description": "熟悉语义化标签、表单和媒体元素", "output": "一个结构清晰的页面骨架" },
              { "title": "样式布局", "description": "练习盒模型、Flex、Grid 和响应式布局", "output": "一个适配移动端的页面" },
              { "title": "交互脚本", "description": "用基础 JavaScript 实现表单、筛选和切换效果", "output": "一个带交互的小页面" }
            ],
            "tools": [
              { "name": "Chrome DevTools", "purpose": "调试样式、布局和脚本行为" },
              { "name": "MDN", "purpose": "查阅标准 API 和浏览器兼容性" }
            ],
            "commonProblems": [
              { "title": "布局总是被撑坏", "detail": "通常是对盒模型、宽高计算和容器约束理解不够完整" }
            ],
            "pitfalls": [
              { "title": "只会照抄样式", "detail": "如果不理解布局原理，换一个页面就会立刻失去迁移能力" }
            ],
            "microMilestones": [
              { "title": "第一次独立还原页面", "outcome": "开始具备从设计稿到页面的转化能力" },
              { "title": "第一次写出可复用组件块", "outcome": "开始理解结构复用和维护成本" }
            ],
            "lastActive": null,
            "milestone": "能够独立编写静态网页",
            "estimatedHours": 20
          },
          "react_framework": {
            "id": "react_framework",
            "name": "React 框架",
            "description": "深入理解组件化开发与状态管理。",
            "whyItMatters": "这是进入现代前端工程化与复杂交互开发的关键门槛。",
            "category": "core",
            "difficulty": "intermediate",
            "bloomLevel": "apply",
            "status": "locked",
            "progress": 0,
            "dependencies": ["frontend_basics"],
            "relatedToExisting": "如果你已经熟悉基础 JavaScript，这里会帮你转向组件化和数据驱动思维。",
            "resources": [{ "name": "React Official Docs", "type": "course" }],
            "learningObjectives": ["理解组件拆分逻辑", "掌握状态与副作用管理", "能搭建基础单页应用"],
            "deliverables": ["一个带路由和状态管理的前端项目"],
            "subSkills": [],
            "conversations": [],
            "aiPendingMessage": null,
            "practiceTips": "不要急着背 API，先用一个小项目反复练习组件拆分、状态提升和数据流。",
            "masteryCriteria": {
              "minimum": "能独立搭建基础 React 项目并拆分组件",
              "proficient": "能处理表单、异步请求和常见状态同步问题",
              "mastery": "能设计清晰的组件边界并优化复杂页面的可维护性"
            },
            "unlockThreshold": "minimum",
            "steps": [
              { "title": "组件化入门", "description": "掌握 JSX、props、state 和事件", "output": "一个组件化页面" },
              { "title": "状态流转", "description": "学习副作用、数据请求和状态提升", "output": "一个含异步数据的页面" }
            ],
            "tools": [
              { "name": "React DevTools", "purpose": "观察组件树与状态变化" }
            ],
            "commonProblems": [
              { "title": "状态散落在多个组件", "detail": "说明拆分边界不清，容易导致同步困难" }
            ],
            "pitfalls": [
              { "title": "过早引入复杂状态库", "detail": "在基础没稳前会增加理解负担和排错成本" }
            ],
            "microMilestones": [
              { "title": "完成第一个 SPA", "outcome": "开始具备完整页面流转和数据交互能力" }
            ],
            "lastActive": null,
            "milestone": "能够开发复杂的单页应用",
            "estimatedHours": 40
          }
        },
        edges: [
          { "from": "frontend_basics", "to": "react_framework", "type": "prerequisite" }
        ],
        categories: [
          { "id": "core", "name": "核心技能", "description": "必须掌握", "color": "#4A90D9", "order": 1 }
        ],
        timeline: []
      });
    } else {
      // 模拟对话回复
      content = JSON.stringify({
        reply: "这是一个模拟的 AI 回复。由于当前处于演示模式，我无法连接到真实的 AI 模型，但我可以展示对话流程。你做得很好，继续加油！",
        bloomAssessment: {
          currentLevel: "understand",
          evidence: "你已经能解释基础概念，并开始尝试把它用到页面练习里。",
          confidence: "medium"
        },
        kolbPrompt: {
          stage: "active",
          question: "如果让你再做一个更小的练习，你会优先验证哪一个知识点？"
        },
        progressUpdate: {
          nodeId: "current_node",
          newProgress: 10,
          reason: "用户完成了基础概念的学习"
        },
        deliberatePracticeTip: "下一次练习时只盯住一个最薄弱的点，比如布局或事件处理，并记录出错原因。",
        nextChallenge: "尝试不看教程，独立做一个更小的页面模块。",
        growthMindsetPhrase: "你现在积累的不是天赋证明，而是可复用的方法感。",
        nextHook: "下次你愿意带着一个具体作品或报错来一起拆解吗？",
        timelineEvent: {
          type: "conversation",
          summary: "进行了一次关于基础知识的模拟对话"
        }
      });
    }

    return {
      content,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      },
      model: "dummy-model",
    };
  }

  async chatStream(messages: LLMMessage[], callbacks: LLMStreamCallbacks): Promise<LLMResponse> {
    const response = await this.chat(messages);
    const text = response.content || '';
    const chunkSize = 64;
    for (let i = 0; i < text.length; i += chunkSize) {
      callbacks.onDelta(text.slice(i, i + chunkSize));
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    return response;
  }
}
