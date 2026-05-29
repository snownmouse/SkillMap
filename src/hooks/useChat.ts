import { useCallback, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { apiClient } from '../services/apiClient';
import { ChatMessage } from '../types/chat';

interface ChatResponseResult {
  reply: string;
  progressUpdate?: { nodeId: string; newProgress: number; reason: string; isStuck?: boolean };
  bloomAssessment?: { currentLevel: string; evidence: string; confidence: 'high' | 'medium' | 'low' };
  kolbPrompt?: { stage: string; question: string };
  newInsight?: string;
  deliberatePracticeTip?: string;
  nextChallenge?: string;
  growthMindsetPhrase?: string;
  nextHook?: string;
  timelineEvent?: { type: string; summary: string; [key: string]: any };
}

export function useChat() {
  const { state, dispatch } = useAppContext();
  const [isSending, setIsSending] = useState(false);
  const loadedHistoryRef = useRef<Set<string>>(new Set());
  const isSendingRef = useRef(false);
  const lastMessageSentRef = useRef<{ nodeId: string; content: string; timestamp: number } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const loadHistory = useCallback(async (nodeId: string) => {
    const currentState = stateRef.current;
    if (!currentState.skillTree?.id || loadedHistoryRef.current.has(nodeId)) return;

    const existingSession = currentState.chatSessions[nodeId];
    if (existingSession?.messages?.length) {
      loadedHistoryRef.current.add(nodeId);
      return;
    }

    try {
      const treeId = currentState.skillTree.id;
      const currentNodeProgress = currentState.skillTree?.nodes[nodeId]?.progress || 0;
      const currentNodeName = currentState.skillTree.nodes[nodeId]?.name;
      const result = await apiClient.getChatHistory(treeId, nodeId);
      const messages: ChatMessage[] = (result.messages || []).map((message: any) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || message.created_at,
        nodeId,
        metadata: message.metadata
          ? {
              progressUpdate: message.metadata.progress_update || message.metadata.progressUpdate
                ? {
                    from: currentNodeProgress,
                    to: message.metadata.progress_update?.new_progress ?? message.metadata.progressUpdate?.newProgress ?? currentNodeProgress,
                  }
                : undefined,
              newInsight: message.metadata.newInsight || message.metadata.new_insight,
              bloomAssessment: message.metadata.bloomAssessment || message.metadata.bloom_assessment,
              kolbPrompt: message.metadata.kolbPrompt || message.metadata.kolb_prompt,
              deliberatePracticeTip: message.metadata.deliberatePracticeTip || message.metadata.deliberate_practice_tip,
              nextChallenge: message.metadata.nextChallenge || message.metadata.next_challenge,
              growthMindsetPhrase: message.metadata.growthMindsetPhrase || message.metadata.growth_mindset_phrase,
              nextHook: message.metadata.nextHook || message.metadata.next_hook,
            }
          : undefined,
      }));

      dispatch({
        type: 'SET_CHAT_HISTORY',
        payload: {
          nodeId,
          nodeName: currentNodeName,
          messages,
        }
      });

      loadedHistoryRef.current.add(nodeId);
    } catch (e) {
      console.error('加载聊天历史失败:', e);
    }
  }, [dispatch]);

  const sendMessage = async (nodeId: string, content: string) => {
    const currentState = stateRef.current;
    const now = Date.now();
    
    // 多层防护机制
    if (!currentState.skillTree) return;
    
    // 1. 检查是否正在发送
    if (isSendingRef.current) {
      console.log('消息正在发送中，防止重复发送');
      return;
    }
    
    // 2. 检查是否是重复消息（相同内容、相同节点、1秒内）
    if (lastMessageSentRef.current && 
        lastMessageSentRef.current.nodeId === nodeId && 
        lastMessageSentRef.current.content === content && 
        now - lastMessageSentRef.current.timestamp < 1000) {
      console.log('检测到重复消息，跳过');
      return;
    }

    const node = currentState.skillTree.nodes[nodeId];
    if (!node) return;

    // 记录这次发送
    lastMessageSentRef.current = { nodeId, content, timestamp: now };
    isSendingRef.current = true;
    setIsSending(true);
    dispatch({ type: 'SET_CHAT_LOADING', payload: true });

    const userMsg: ChatMessage = {
      id: now.toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      nodeId,
    };
    dispatch({ type: 'ADD_CONVERSATION', payload: { nodeId, message: userMsg } });

    try {
      const result = await apiClient.sendChatMessage({
        nodeId,
        nodeName: node.name,
        nodeHistory: '',
        currentProgress: node.progress,
        userMessage: content,
        treeSummary: currentState.skillTree.summary,
        conversationId: '',
        treeId: currentState.skillTree.id,
      }) as ChatResponseResult;

      // 重新从后端拉取最新的技能树数据，确保进度和所有数据都是最新的
      try {
        const freshTreeData = await apiClient.getSkillTreeById(currentState.skillTree.id);
        dispatch({ type: 'SET_SKILL_TREE', payload: freshTreeData });
      } catch (refreshError) {
        console.warn('刷新技能树数据失败，使用本地更新:', refreshError);
      }

      const aiMsg: ChatMessage = {
        id: (now + 1).toString(),
        role: 'assistant',
        content: result.reply,
        timestamp: new Date().toISOString(),
        nodeId,
        metadata: {
          progressUpdate: result.progressUpdate ? { from: node.progress, to: result.progressUpdate.newProgress } : undefined,
          newInsight: result.newInsight,
          bloomAssessment: result.bloomAssessment,
          kolbPrompt: result.kolbPrompt,
          deliberatePracticeTip: result.deliberatePracticeTip,
          nextChallenge: result.nextChallenge,
          growthMindsetPhrase: result.growthMindsetPhrase,
          nextHook: result.nextHook,
        }
      };
      dispatch({ type: 'ADD_CONVERSATION', payload: { nodeId, message: aiMsg } });

      // 如果有进度更新，在本地也同步更新（作为后备方案）
      if (result.progressUpdate) {
        dispatch({
          type: 'UPDATE_NODE_PROGRESS',
          payload: { nodeId, progress: result.progressUpdate.newProgress }
        });
      }

      if (result.nextHook) {
        dispatch({
          type: 'UPDATE_NODE_PENDING_MESSAGE',
          payload: { nodeId, message: result.nextHook }
        });
      }

      if (result.bloomAssessment || result.kolbPrompt || result.deliberatePracticeTip || result.nextChallenge || result.growthMindsetPhrase || result.nextHook) {
        dispatch({
          type: 'UPDATE_NODE_COACHING',
          payload: {
            nodeId,
            pendingMessage: result.nextHook,
            latestCoaching: {
              bloomAssessment: result.bloomAssessment,
              kolbPrompt: result.kolbPrompt,
              deliberatePracticeTip: result.deliberatePracticeTip,
              nextChallenge: result.nextChallenge,
              growthMindsetPhrase: result.growthMindsetPhrase,
              nextHook: result.nextHook,
              summary: result.timelineEvent?.summary || result.newInsight,
              updatedAt: new Date().toISOString(),
            }
          }
        });
      }

      if (result.timelineEvent) {
        dispatch({
          type: 'ADD_TIMELINE_EVENT',
          payload: {
            ...result.timelineEvent,
            date: new Date().toISOString(),
            nodeId
          }
        });
      }

    } catch (e) {
      console.error('发送消息失败:', e);
      dispatch({ type: 'SET_ERROR', payload: '发送消息失败，请重试' });
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
      dispatch({ type: 'SET_CHAT_LOADING', payload: false });
    }
  };

  return {
    chatSessions: state.chatSessions,
    isSending,
    isChatLoading: state.isChatLoading,
    loadHistory,
    sendMessage,
  };
}
