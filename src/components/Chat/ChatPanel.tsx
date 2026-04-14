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
  const { chatSessions, isChatLoading, sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  const session = chatSessions[nodeId];
  const messages = session?.messages || [];

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatLoading]);

  return (
    <div className="flex flex-col h-full bg-dark-bg">
      {/* 内部头部 */}
      {onBack && (
        <div className="p-3 border-b border-dark-border flex items-center bg-dark-surface">
          <button 
            onClick={onBack}
            className="text-dark-muted hover:text-dark-text mr-2"
          >
            ←
          </button>
          <span className="text-xs font-bold text-dark-text">与 AI 导师对话</span>
        </div>
      )}

      {/* 消息列表 */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && !isChatLoading && (
          <div className="text-center py-10">
            <p className="text-dark-muted text-sm italic">
              你可以询问关于该技能的学习建议、复盘你的学习进度，或者让 AI 帮你解答疑问。
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} />
        ))}

        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-dark-surface p-3 rounded-2xl rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-dark-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-dark-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-dark-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t border-dark-border bg-dark-surface">
        <ChatInput 
          onSend={(content) => sendMessage(nodeId, content)} 
          disabled={isChatLoading} 
        />
      </div>
    </div>
  );
};

export default ChatPanel;
