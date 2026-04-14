import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

/**
 * 对话输入框组件
 */
const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  const handleSend = () => {
    if (content.trim() && !disabled) {
      onSend(content.trim());
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end space-x-2">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息..."
        disabled={disabled}
        className="flex-1 bg-dark-bg text-dark-text text-sm rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-skill-core resize-none min-h-[44px] max-h-[120px] disabled:opacity-50"
        rows={1}
      />
      <button
        onClick={handleSend}
        disabled={!content.trim() || disabled}
        className="p-3 bg-skill-core text-white rounded-xl hover:bg-skill-core/80 disabled:opacity-50 disabled:bg-dark-muted transition-all"
      >
        <span className="transform rotate-90 inline-block">✈️</span>
      </button>
    </div>
  );
};

export default ChatInput;
