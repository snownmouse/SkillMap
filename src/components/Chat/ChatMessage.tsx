import React from 'react';
import { ChatMessage } from '../../types/chat';

interface ChatMessageProps {
  message: ChatMessage;
}

/**
 * 消息气泡组件
 */
const ChatMessageItem: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div 
          className={`p-3 text-sm leading-relaxed ${
            isUser 
              ? 'bg-skill-core text-white rounded-2xl rounded-tr-none' 
              : 'bg-dark-surface text-dark-text border border-dark-border rounded-2xl rounded-tl-none'
          }`}
        >
          {message.content}
        </div>
        
        {/* 进度更新提示 */}
        {message.metadata?.progressUpdate && (
          <div className="mt-2 px-3 py-1 bg-status-inProgress/20 border border-status-inProgress/40 rounded-full flex items-center space-x-2">
            <span className="text-[10px] font-bold text-status-inProgress uppercase tracking-tight">进度更新</span>
            <span className="text-xs text-dark-text font-mono">
              {message.metadata.progressUpdate.from}% → {message.metadata.progressUpdate.to}% ↑
            </span>
          </div>
        )}

        <span className="text-[10px] text-dark-muted mt-1 px-1">{time}</span>
      </div>
    </div>
  );
};

export default ChatMessageItem;
