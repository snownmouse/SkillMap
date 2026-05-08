export type NodeStatus = 'locked' | 'available' | 'in_progress' | 'completed';
export type NodeCategory = 'core' | 'specialization' | 'general';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type CoachingConfidence = 'high' | 'medium' | 'low';
export type KolbStage = 'concrete' | 'reflective' | 'abstract' | 'active';
export type UnlockThreshold = 'minimum' | 'proficient' | 'mastery';

export interface SkillResource {
  name: string;
  type: 'course' | 'book' | 'practice' | 'tool';
  url?: string;
}

export interface SubSkill {
  id: string;
  name: string;
  status: NodeStatus;
  progress: number;
}

export interface ConversationRecord {
  date: string;
  userSaid: string;
  aiReplied: string;
  progressChange: [number, number];
}

export interface MasteryCriteria {
  minimum: string;
  proficient: string;
  mastery: string;
}

export interface LearningStep {
  title: string;
  description: string;
  output?: string;
}

export interface ToolRecommendation {
  name: string;
  purpose: string;
}

export interface InsightCard {
  title: string;
  detail: string;
}

export interface MicroMilestone {
  title: string;
  outcome: string;
}

export interface BloomAssessment {
  currentLevel: BloomLevel;
  evidence: string;
  confidence: CoachingConfidence;
}

export interface KolbPrompt {
  stage: KolbStage;
  question: string;
}

export interface CoachSnapshot {
  bloomAssessment?: BloomAssessment;
  kolbPrompt?: KolbPrompt;
  deliberatePracticeTip?: string;
  nextChallenge?: string;
  growthMindsetPhrase?: string;
  nextHook?: string;
  summary?: string;
  updatedAt?: string;
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  whyItMatters?: string;
  category: NodeCategory;
  difficulty: Difficulty;
  bloomLevel?: BloomLevel;
  status: NodeStatus;
  progress: number;
  dependencies: string[];
  relatedToExisting?: string;
  resources: SkillResource[];
  learningObjectives: string[];
  deliverables: string[];
  subSkills: SubSkill[];
  conversations: ConversationRecord[];
  aiPendingMessage: string | null;
  practiceTips?: string;
  masteryCriteria?: MasteryCriteria;
  unlockThreshold?: UnlockThreshold;
  latestCoaching?: CoachSnapshot | null;
  lastActive: string | null;
  milestone: string;
  estimatedHours: number;
  steps?: LearningStep[];
  tools?: ToolRecommendation[];
  commonProblems?: InsightCard[];
  pitfalls?: InsightCard[];
  microMilestones?: MicroMilestone[];
  jdFrequency?: number;
}

export interface SkillEdge {
  from: string;
  to: string;
  type: 'prerequisite' | 'related';
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  order: number;
}

export interface TimelineEvent {
  date: string;
  type: 'progress' | 'conversation' | 'unlock' | 'insight';
  summary: string;
  nodeId?: string;
  details?: Record<string, unknown>;
}

export type PlanPath = 'tech' | 'management' | 'slash' | 'grassroot' | 'national_strategy' | 'startup' | 'stable';

export interface PlanStage {
  id: string;
  title: string;
  objective: string;
  keyResults: string[];
  suggestedMonths?: number;
}

export interface PlanPathOption {
  id: PlanPath;
  name: string;
  description: string;
  stageRoadmap?: Array<{
    stageId: string;
    route: string[];
    explanation?: string;
  }>;
  fitScore?: number;
  fitReason?: string;
}

export interface PlanMeta {
  longTermGoal?: string;
  stages?: PlanStage[];
  selectedStageId?: string;
  paths?: PlanPathOption[];
  selectedPathId?: PlanPath;
}

export interface SkillTreeData {
  id?: string; // 后端返回的唯一ID
  version: string;
  career: string;
  summary: string;
  estimatedMonths?: number;
  overallObjective?: string;
  overallKeyResults?: string[];
  generatedAt: string;
  planMeta?: PlanMeta;
  nodes: Record<string, SkillNode>;
  edges: SkillEdge[];
  categories: Category[];
  timeline: TimelineEvent[];
}

export interface UserInput {
  major: string;
  career: string;
  level: 'zero' | 'basic' | 'intermediate' | 'advanced';
  weeklyHours: number;
  notes: string;
  existingSkills?: string[];
  longTermGoal?: string;
  planMeta?: PlanMeta;
}
