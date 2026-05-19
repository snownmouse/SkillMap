import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  aiPendingMessage?: string | null;
}

const QUICK_PROMPTS = [
  { label: '今日复盘', text: '今天我练习了这个技能，让我来复盘一下...' },
  { label: '遇到困难', text: '我在学习过程中遇到了一个卡点...' },
  { label: '完成练习', text: '我完成了一个练习/项目，来回顾一下...' },
  { label: '反思总结', text: '回顾最近的学习，我发现...' },
  { label: '寻求建议', text: '我想知道接下来应该怎么学...' },
];

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, aiPendingMessage }) => {
  const [content, setContent] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleQuickPrompt = (text: string) => {
    setContent(text);
    setShowPrompts(false);
    textareaRef.current?.focus();
  };

  const handleAiPromptClick = () => {
    if (aiPendingMessage) {
      setContent(aiPendingMessage);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="space-y-2">
      {aiPendingMessage && (
        <button
          onClick={handleAiPromptClick}
          className="w-full text-left rounded-xl border border-[rgba(156,180,179,0.35)] bg-[rgba(156,180,179,0.12)] px-3 py-2 text-xs text-app-text hover:bg-[rgba(156,180,179,0.2)] transition-colors"
        >
          💬 {aiPendingMessage}
        </button>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowPrompts(!showPrompts)}
          className="p-2 rounded-lg text-app-muted hover:bg-app-bg hover:text-app-text transition-colors"
          title="快捷复盘模板"
        >
          {showPrompts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="flex-1 flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="记录你的复盘..."
            disabled={disabled}
            className="flex-1 bg-app-bg text-app-text text-sm rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-skill-core resize-none min-h-[44px] max-h-[120px] disabled:opacity-50"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!content.trim() || disabled}
            className="p-3 bg-skill-core text-white rounded-xl hover:bg-skill-core/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:bg-app-muted transition-all"
          >
            <span className="transform inline-block">✨</span>
          </button>
        </div>
      </div>

      {showPrompts && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt.label}
              onClick={() => handleQuickPrompt(prompt.text)}
              className="rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-[11px] text-app-text hover:bg-skill-core/10 hover:border-skill-core/30 hover:text-skill-core transition-all"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatInput;
