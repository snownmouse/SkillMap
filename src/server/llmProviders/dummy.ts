import { LLMMessage, LLMResponse } from "../../types/backend";
import { ILLMProvider } from "./base";

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
        career: "全栈开发工程师 (模拟)",
        summary: "从零开始掌握现代全栈开发技术栈。",
        generatedAt: new Date().toISOString(),
        nodes: {
          "frontend_basics": {
            "id": "frontend_basics",
            "name": "前端基础",
            "description": "掌握 HTML5, CSS3 和基础 JavaScript。",
            "category": "core",
            "difficulty": "beginner",
            "status": "available",
            "progress": 0,
            "dependencies": [],
            "resources": [{ "name": "MDN Web Docs", "type": "tool", "url": "https://developer.mozilla.org" }],
            "subSkills": [],
            "conversations": [],
            "aiPendingMessage": null,
            "lastActive": null,
            "milestone": "能够独立编写静态网页",
            "estimatedHours": 20
          },
          "react_framework": {
            "id": "react_framework",
            "name": "React 框架",
            "description": "深入理解组件化开发与状态管理。",
            "category": "core",
            "difficulty": "intermediate",
            "status": "locked",
            "progress": 0,
            "dependencies": ["frontend_basics"],
            "resources": [{ "name": "React Official Docs", "type": "course" }],
            "subSkills": [],
            "conversations": [],
            "aiPendingMessage": null,
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
        progress_update: {
          node_id: "current_node",
          new_progress: 10,
          reason: "用户完成了基础概念的学习"
        },
        timeline_event: {
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
}
