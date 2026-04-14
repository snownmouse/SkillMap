import { GoogleGenAI, Type } from "@google/genai";
import { UserInput, SkillTreeData } from "../types/skillTree";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Gemini AI 服务
 * 替代 Dify 实现技能树生成和对话逻辑
 */
export const geminiService = {
  /**
   * 生成技能树
   */
  async generateSkillTree(inputs: UserInput): Promise<SkillTreeData> {
    const prompt = `
      你是一个专业的职业规划师和技能地图专家。请根据以下用户信息生成一个详细的技能树。
      
      用户信息：
      - 专业/背景: ${inputs.major}
      - 职业意向: ${inputs.career}
      - 当前水平: ${inputs.level}
      - 每周投入时间: ${inputs.weeklyHours} 小时
      - 补充说明: ${inputs.notes}
      - 已掌握技能: ${(inputs.existingSkills || []).join(', ')}
      
      要求：
      1. 生成一个包含 15-25 个节点的技能树。
      2. 节点分为 'core' (核心), 'specialization' (专精), 'general' (通用) 三类。
      3. 节点难度分为 'beginner', 'intermediate', 'advanced'。
      4. 节点之间有依赖关系 (dependencies)，形成一个有向无环图。
      5. 为每个节点提供 2-3 个学习资源。
      6. 初始状态：根据用户的 '已掌握技能' 和 '当前水平'，将已掌握的设为 'completed' (100%)，
         将可以开始学习的设为 'available' (0%)，其余设为 'locked'。
      7. 返回结果必须是严格的 JSON 格式，符合 SkillTreeData 结构。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            version: { type: Type.STRING },
            career: { type: Type.STRING },
            summary: { type: Type.STRING },
            generatedAt: { type: Type.STRING },
            nodes: {
              type: Type.OBJECT,
              additionalProperties: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING, enum: ['core', 'specialization', 'general'] },
                  difficulty: { type: Type.STRING, enum: ['beginner', 'intermediate', 'advanced'] },
                  status: { type: Type.STRING, enum: ['locked', 'available', 'in_progress', 'completed'] },
                  progress: { type: Type.NUMBER },
                  dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                  resources: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['course', 'book', 'practice', 'tool'] },
                        url: { type: Type.STRING }
                      }
                    }
                  },
                  subSkills: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        status: { type: Type.STRING },
                        progress: { type: Type.NUMBER }
                      }
                    }
                  },
                  milestone: { type: Type.STRING },
                  estimatedHours: { type: Type.NUMBER }
                },
                required: ['id', 'name', 'description', 'category', 'difficulty', 'status', 'progress', 'dependencies', 'resources', 'subSkills', 'milestone', 'estimatedHours']
              }
            },
            edges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  from: { type: Type.STRING },
                  to: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['prerequisite', 'related'] }
                }
              }
            },
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  color: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text);
  },

  /**
   * 对话逻辑
   */
  async chat(params: {
    nodeId: string;
    nodeName: string;
    nodeHistory: any[];
    currentProgress: number;
    userMessage: string;
    treeSummary: string;
    fullTreeJson: string;
  }) {
    const prompt = `
      你是一个专业的技能导师。你正在指导学生学习 "${params.nodeName}"。
      
      上下文：
      - 节点名称: ${params.nodeName}
      - 当前进度: ${params.currentProgress}%
      - 技能树背景: ${params.treeSummary}
      
      对话历史：
      ${JSON.stringify(params.nodeHistory)}
      
      用户消息：
      "${params.userMessage}"
      
      你的任务：
      1. 回复用户的消息，提供指导、解答或鼓励。
      2. 如果用户表现出对知识的掌握，或者完成了你布置的小任务，可以建议增加进度。
      3. 如果进度达到 100%，请在回复中祝贺用户并提示解锁了后续技能。
      4. 返回结果必须是 JSON 格式。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            progress_update: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                node_id: { type: Type.STRING },
                new_progress: { type: Type.NUMBER },
                reason: { type: Type.STRING }
              }
            },
            new_insight: { type: Type.STRING, nullable: true },
            next_hook: { type: Type.STRING, nullable: true },
            timeline_event: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                type: { type: Type.STRING, enum: ['progress', 'conversation', 'unlock', 'insight'] },
                summary: { type: Type.STRING }
              }
            },
            conversation_record: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                userSaid: { type: Type.STRING },
                aiReplied: { type: Type.STRING },
                progressChange: { type: Type.ARRAY, items: { type: Type.NUMBER } }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text);
    return {
      reply: result.reply,
      progressUpdate: result.progress_update,
      newInsight: result.new_insight,
      nextHook: result.next_hook,
      timelineEvent: result.timeline_event,
      conversationRecord: result.conversation_record
    };
  }
};
