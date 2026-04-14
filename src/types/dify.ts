export interface DifyGenerateRequest {
  inputs: {
    major: string;
    career: string;
    level: string;
    weekly_hours: number;
    notes: string;
    existing_skills: string;
  };
  response_mode: 'blocking';
  user: string;
}

export interface DifyChatRequest {
  inputs: {
    node_id: string;
    node_name: string;
    node_history: string;
    node_current_progress: number;
    user_message: string;
    tree_summary: string;
    full_tree_json: string;
  };
  query: string;
  response_mode: 'blocking';
  conversation_id: string;
  user: string;
}

export interface DifyChatResponse {
  answer: string;
  conversation_id: string;
  message_id: string;
  metadata?: any;
}

export interface DifyWorkflowResponse {
  data: {
    outputs: Record<string, any>;
    status: string;
    error?: string;
  };
}
