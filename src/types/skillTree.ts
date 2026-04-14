export type NodeStatus = 'locked' | 'available' | 'in_progress' | 'completed';
export type NodeCategory = 'core' | 'specialization' | 'general';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

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

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  category: NodeCategory;
  difficulty: Difficulty;
  status: NodeStatus;
  progress: number;
  dependencies: string[];
  resources: SkillResource[];
  subSkills: SubSkill[];
  conversations: ConversationRecord[];
  aiPendingMessage: string | null;
  lastActive: string | null;
  milestone: string;
  estimatedHours: number;
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

export interface SkillTreeData {
  id?: string; // 后端返回的唯一ID
  version: string;
  career: string;
  summary: string;
  generatedAt: string;
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
}
