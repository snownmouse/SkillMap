import React, { useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatMessageItem from './ChatMessage';
import ChatInput from './ChatInput';

interface ChatPanelProps {
  nodeId: string;
  onBack?: () => void;
}

/**
 * 对话面板组件
 */
const ChatPanel: React.FC<ChatPanelProps> = ({ nodeId, onBack }) => {
  const { chatSessions, isChatLoading, loadHistory, sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  const session = chatSessions[nodeId];
  const messages = session?.messages || [];

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatLoading]);

  useEffect(() => {
    loadHistory(nodeId);
  }, [loadHistory, nodeId]);

  return (
    <div className="flex flex-col h-full bg-app-bg">
      {/* 内部头部 */}
      {onBack && (
        <div className="flex items-center border-b border-app-border bg-app-surface/90 p-3">
          <button 
            onClick={onBack}
            className="mr-2 rounded-lg px-2 py-1 text-app-muted transition-colors hover:bg-app-surface hover:text-app-text"
          >
            ←
          </button>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-app-text">Growth Journal</span>
        </div>
      )}

      {/* 消息列表 */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && !isChatLoading && (
          <div className="panel-card-soft rounded-2xl px-4 py-6 text-center">
            <p className="text-sm italic text-app-muted">
              🌱 这是你的专属成长日记，你可以问我任何问题...
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} />
        ))}

        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-[rgba(255,250,240,0.6)] border border-[rgba(214,176,165,0.2)] p-3 rounded-[2px] rounded-br-[20px] shadow-sm">
              <div className="flex flex-col gap-1 items-start">
                <div className="flex space-x-1.5 items-center h-4">
                  <div className="w-1.5 h-1.5 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] text-app-muted mt-1 italic font-hand">正在为你描绘路径...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入框 */}
      <div className="border-t border-app-border bg-app-surface/90 p-4">
        <ChatInput 
          onSend={(content) => sendMessage(nodeId, content)} 
          disabled={isChatLoading} 
        />
      </div>
    </div>
  );
};

export default ChatPanel;
