export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  nodeId?: string;
  metadata?: {
    progressUpdate?: { from: number; to: number };
    newInsight?: string;
    bloomAssessment?: { currentLevel: string; evidence: string; confidence: 'high' | 'medium' | 'low' };
    kolbPrompt?: { stage: string; question: string };
    deliberatePracticeTip?: string;
    nextChallenge?: string;
    growthMindsetPhrase?: string;
    nextHook?: string;
  };
}

export interface ChatSession {
  nodeId: string;
  nodeName: string;
  messages: ChatMessage[];
  startedAt: string;
  lastActiveAt: string;
}
