import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { CoachSnapshot, SkillTreeData, SkillNode, TimelineEvent } from '../types/skillTree';
import { ChatSession, ChatMessage } from '../types/chat';
import { storage } from '../services/storage';

/**
 * 全局状态定义
 */
interface AppState {
  skillTree: SkillTreeData | null;
  chatSessions: Record<string, ChatSession>;
  activeNodeId: string | null;
  isGenerating: boolean;
  isChatLoading: boolean;
  error: string | null;
  auth?: {
    token: string | null;
    refreshToken?: string | null;
    user?: { id: string; username: string; displayName: string } | null;
  } | null;
}

type AppAction =
  | { type: 'SET_SKILL_TREE'; payload: SkillTreeData }
  | { type: 'UPDATE_NODE_PROGRESS'; payload: { nodeId: string; progress: number } }
  | { type: 'UPDATE_NODE_DATA'; payload: { nodeId: string; nodeData: Partial<SkillNode> } }
  | { type: 'SET_AUTH'; payload: { token: string | null; refreshToken?: string | null; user?: { id: string; username: string; displayName: string } | null } | null }
  | { type: 'CLEAR_AUTH' }
  | { type: 'ADD_CONVERSATION'; payload: { nodeId: string; message: ChatMessage } }
  | { type: 'SET_CHAT_HISTORY'; payload: { nodeId: string; nodeName?: string; messages: ChatMessage[] } }
  | { type: 'SET_ACTIVE_NODE'; payload: string | null }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_CHAT_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_FROM_STORAGE'; payload: AppState }
  | { type: 'ADD_TIMELINE_EVENT'; payload: TimelineEvent }
  | { type: 'UPDATE_NODE_PENDING_MESSAGE'; payload: { nodeId: string; message: string | null } }
  | { type: 'UPDATE_NODE_COACHING'; payload: { nodeId: string; latestCoaching: CoachSnapshot | null; pendingMessage?: string | null } };

const initialState: AppState = {
  skillTree: null,
  chatSessions: {},
  activeNodeId: null,
  isGenerating: false,
  isChatLoading: false,
  error: null,
  auth: null,
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SKILL_TREE':
      return { ...state, skillTree: action.payload, error: null };
    case 'UPDATE_NODE_PROGRESS':
      if (!state.skillTree) return state;
      const nodes = { ...state.skillTree.nodes };
      if (nodes[action.payload.nodeId]) {
        const nextProgress = Math.max(0, Math.min(100, action.payload.progress));
        const previousStatus = nodes[action.payload.nodeId].status;
        nodes[action.payload.nodeId] = {
          ...nodes[action.payload.nodeId],
          progress: nextProgress,
          status: nextProgress >= 100
            ? 'completed'
            : nextProgress > 0
              ? 'in_progress'
              : previousStatus === 'locked'
                ? 'locked'
                : 'available'
        };
      }
      return { ...state, skillTree: { ...state.skillTree, nodes } };
    case 'UPDATE_NODE_DATA':
      if (!state.skillTree) return state;
      if (!state.skillTree.nodes[action.payload.nodeId]) return state;
      return {
        ...state,
        skillTree: {
          ...state.skillTree,
          nodes: {
            ...state.skillTree.nodes,
            [action.payload.nodeId]: {
              ...state.skillTree.nodes[action.payload.nodeId],
              ...action.payload.nodeData,
              id: action.payload.nodeId,
            }
          }
        }
      };
    case 'ADD_CONVERSATION':
      const sessions = { ...state.chatSessions };
      const nodeId = action.payload.nodeId;
      if (!sessions[nodeId]) {
        sessions[nodeId] = {
          nodeId,
          nodeName: state.skillTree?.nodes[nodeId]?.name || '未知节点',
          messages: [],
          startedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        };
      }
      sessions[nodeId].messages.push(action.payload.message);
      sessions[nodeId].lastActiveAt = new Date().toISOString();
      return { ...state, chatSessions: sessions };
    case 'SET_CHAT_HISTORY':
      const existingSession = state.chatSessions[action.payload.nodeId];
      return {
        ...state,
        chatSessions: {
          ...state.chatSessions,
          [action.payload.nodeId]: {
            nodeId: action.payload.nodeId,
            nodeName: action.payload.nodeName || existingSession?.nodeName || state.skillTree?.nodes[action.payload.nodeId]?.name || '未知节点',
            messages: action.payload.messages,
            startedAt: action.payload.messages[0]?.timestamp || existingSession?.startedAt || new Date().toISOString(),
            lastActiveAt: action.payload.messages[action.payload.messages.length - 1]?.timestamp || existingSession?.lastActiveAt || new Date().toISOString(),
          }
        }
      };
    case 'SET_ACTIVE_NODE':
      return { ...state, activeNodeId: action.payload };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_CHAT_LOADING':
      return { ...state, isChatLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_AUTH':
      return { ...state, auth: action.payload };
    case 'CLEAR_AUTH':
      return { ...state, auth: null };
    case 'LOAD_FROM_STORAGE':
      return { ...state, ...action.payload };
    case 'ADD_TIMELINE_EVENT':
      if (!state.skillTree) return state;
      return {
        ...state,
        skillTree: {
          ...state.skillTree,
          timeline: [action.payload, ...state.skillTree.timeline]
        }
      };
    case 'UPDATE_NODE_PENDING_MESSAGE':
      if (!state.skillTree) return state;
      const nodesWithPending = { ...state.skillTree.nodes };
      if (nodesWithPending[action.payload.nodeId]) {
        nodesWithPending[action.payload.nodeId] = {
          ...nodesWithPending[action.payload.nodeId],
          aiPendingMessage: action.payload.message
        };
      }
      return { ...state, skillTree: { ...state.skillTree, nodes: nodesWithPending } };
    case 'UPDATE_NODE_COACHING':
      if (!state.skillTree) return state;
      const nodesWithCoaching = { ...state.skillTree.nodes };
      if (nodesWithCoaching[action.payload.nodeId]) {
        nodesWithCoaching[action.payload.nodeId] = {
          ...nodesWithCoaching[action.payload.nodeId],
          latestCoaching: action.payload.latestCoaching,
          aiPendingMessage: action.payload.pendingMessage ?? nodesWithCoaching[action.payload.nodeId].aiPendingMessage,
        };
      }
      return { ...state, skillTree: { ...state.skillTree, nodes: nodesWithCoaching } };
    default:
      return state;
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 初始化加载
  useEffect(() => {
    const savedState = storage.load();
    if (savedState) {
      dispatch({ type: 'LOAD_FROM_STORAGE', payload: savedState });
    }
  }, []);

  // 自动保存
  useEffect(() => {
    storage.save(state);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
