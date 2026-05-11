export type { SkillTreeData, SkillNode, SkillEdge, Category, TimelineEvent, PlanPath, PlanMeta, PlanStage, PlanPathOption } from './skillTree';

export type LLMProvider = 'gemini' | 'deepseek' | 'siliconflow' | 'qwen' | 'ark' | 'custom' | 'dummy';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface GenerateTreeRequest {
  major: string;
  career: string;
  level: 'zero' | 'basic' | 'intermediate' | 'advanced';
  weeklyHours: number;
  notes: string;
  existingSkills?: string[];
  longTermGoal?: string;
  planMeta?: import('./skillTree').PlanMeta;
}

export interface ChatRequest {
  treeId: string;
  nodeId: string;
  message: string;
}

export interface ChatResponse {
  reply: string;
  bloomAssessment?: { currentLevel: string; evidence: string; confidence: 'high' | 'medium' | 'low' };
  kolbPrompt?: { stage: string; question: string };
  progressUpdate?: { nodeId: string; newProgress: number; reason: string; isStuck?: boolean };
  newInsight?: string;
  deliberatePracticeTip?: string;
  nextChallenge?: string;
  growthMindsetPhrase?: string;
  nextHook?: string;
  timelineEvent?: { type: string; summary: string };
}

export interface TreeRecord {
  id: string;
  userId: string;
  career: string;
  treeData: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRecord {
  id: string;
  treeId: string;
  nodeId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: string;
  createdAt: string;
}

export interface ChineseDimension {
  jiaGuoQingHuai: number;
  yiLiJianGu: number;
  mingDeHongDao: number;
  shiJianZhiXiang: number;
}

export interface WesternDimension {
  hollandMatch: number;
  careerAnchorMatch: number;
}

export interface CareerFitScore {
  hollandMatch: number;
  careerAnchorMatch: number;
  nationalDemand: number;
  socialContribution: number;
  culturalHeritage: number;
  grassrootWillingness: number;
  chineseDimension: ChineseDimension;
  finalScore: number;
}

export interface Dimension {
  valueAlignment: number;
  practiceOrientation: number;
  socialContribution: number;
  developmentPotential: number;
  peopleOriented: number;
}
