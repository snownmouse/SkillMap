export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  nodeId?: string;
  metadata?: {
    progressUpdate?: { from: number; to: number };
    newInsight?: string;
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
