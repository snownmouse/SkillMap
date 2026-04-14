import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { difyApi } from '../services/difyApi';
import { ChatMessage } from '../types/chat';

/**
 * 对话状态管理 Hook
 */
export function useChat() {
  const { state, dispatch } = useAppContext();
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async (nodeId: string, content: string) => {
    if (!state.skillTree) return;
    
    const node = state.skillTree.nodes[nodeId];
    if (!node) return;

    setIsSending(true);
    dispatch({ type: 'SET_CHAT_LOADING', payload: true });

    // 1. 添加用户消息
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      nodeId,
    };
    dispatch({ type: 'ADD_CONVERSATION', payload: { nodeId, message: userMsg } });

    try {
      // 2. 调用 Dify API
      const session = state.chatSessions[nodeId];
      const result = await difyApi.sendChatMessage({
        nodeId,
        nodeName: node.name,
        nodeHistory: JSON.stringify(session?.messages || []),
        currentProgress: node.progress,
        userMessage: content,
        treeSummary: state.skillTree.summary,
        fullTreeJson: JSON.stringify(state.skillTree),
        conversationId: '', // TODO: 维护真正的 conversationId
        treeId: state.skillTree.id,
      });

      // 3. 添加 AI 回复
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.reply,
        timestamp: new Date().toISOString(),
        nodeId,
        metadata: {
          progressUpdate: result.progressUpdate ? { from: node.progress, to: result.progressUpdate.newProgress } : undefined,
          newInsight: result.newInsight,
          nextHook: result.nextHook,
        }
      };
      dispatch({ type: 'ADD_CONVERSATION', payload: { nodeId, message: aiMsg } });

      // 4. 更新节点进度
      if (result.progressUpdate) {
        dispatch({ 
          type: 'UPDATE_NODE_PROGRESS', 
          payload: { nodeId, progress: result.progressUpdate.newProgress } 
        });
      }

      // 5. 更新 AI 建议
      if (result.nextHook) {
        dispatch({
          type: 'UPDATE_NODE_PENDING_MESSAGE',
          payload: { nodeId, message: result.nextHook }
        });
      }

      // 6. 添加时间线事件
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
      setIsSending(false);
      dispatch({ type: 'SET_CHAT_LOADING', payload: false });
    }
  };

  return {
    chatSessions: state.chatSessions,
    isSending,
    isChatLoading: state.isChatLoading,
    sendMessage,
  };
}
