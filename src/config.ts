export const CONFIG = {
  DIFY_API_BASE_URL: (import.meta.env.VITE_DIFY_API_BASE_URL || process.env.VITE_DIFY_API_BASE_URL || '').replace(/\/$/, ''),
  DIFY_API_KEY: import.meta.env.VITE_DIFY_API_KEY || process.env.VITE_DIFY_API_KEY || '',
  DIFY_GENERATE_WORKFLOW_ID: import.meta.env.VITE_DIFY_GENERATE_WORKFLOW_ID || process.env.VITE_DIFY_GENERATE_WORKFLOW_ID || '',
  DIFY_CHAT_WORKFLOW_ID: import.meta.env.VITE_DIFY_CHAT_WORKFLOW_ID || process.env.VITE_DIFY_CHAT_WORKFLOW_ID || '',
};
