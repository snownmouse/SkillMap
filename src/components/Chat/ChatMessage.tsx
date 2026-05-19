import React from 'react';
import { ChatMessage } from '../../types/chat';

interface ChatMessageProps {
  message: ChatMessage;
}

const ChatMessageItem: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const coachMeta = message.metadata;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`p-3 text-sm leading-relaxed relative ${
            isUser
              ? 'bg-[#FAF5ED] text-app-text border border-app-border rounded-[20px] rounded-tr-[4px] shadow-[2px_2px_8px_rgba(214,176,165,0.15)] font-hand text-lg'
              : 'bg-[rgba(255,250,240,0.8)] text-app-text border border-[rgba(214,176,165,0.2)] rounded-[2px] rounded-br-[20px] shadow-[1px_3px_10px_rgba(214,176,165,0.1)]'
          }`}
        >
          {message.content}
        </div>

        {message.metadata?.progressUpdate && (
          <div className="mt-2 px-3 py-1 bg-status-inProgress/10 border border-status-inProgress/30 rounded-full flex items-center space-x-2 animate-scale-in">
            <span className="text-[10px] font-bold text-status-inProgress uppercase tracking-tight">🌱 成长印记</span>
            <span className="text-xs text-app-text font-mono">
              {message.metadata.progressUpdate.from}% → {message.metadata.progressUpdate.to}% ↑
            </span>
          </div>
        )}

        {!isUser && coachMeta && (
          <div className="mt-3 w-full space-y-2">
            {coachMeta.bloomAssessment && (
              <div className="rounded-2xl border border-app-border bg-app-surface/70 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-muted">Bloom 评估</div>
                <div className="mt-1 text-sm font-semibold text-app-text">{coachMeta.bloomAssessment.currentLevel}</div>
                <p className="mt-1 text-xs leading-5 text-app-muted">{coachMeta.bloomAssessment.evidence}</p>
              </div>
            )}

            {coachMeta.kolbPrompt && (
              <div className="rounded-2xl border border-app-border bg-app-surface/70 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-muted">下一轮反思</div>
                <p className="mt-1 text-sm leading-6 text-app-text">{coachMeta.kolbPrompt.question}</p>
              </div>
            )}

            {coachMeta.deliberatePracticeTip && (
              <div className="rounded-2xl border border-[rgba(232,159,110,0.25)] bg-[rgba(232,159,110,0.08)] px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-skill-core">刻意练习</div>
                <p className="mt-1 text-sm leading-6 text-app-text">{coachMeta.deliberatePracticeTip}</p>
              </div>
            )}

            {coachMeta.nextChallenge && (
              <div className="rounded-2xl border border-[rgba(156,180,179,0.35)] bg-[rgba(156,180,179,0.12)] px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-status-completed">下一挑战</div>
                <p className="mt-1 text-sm leading-6 text-app-text">{coachMeta.nextChallenge}</p>
              </div>
            )}

            {coachMeta.growthMindsetPhrase && (
              <div className="rounded-2xl border border-[rgba(156,180,179,0.25)] bg-[rgba(156,180,179,0.08)] px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-status-completed">成长鼓励</div>
                <p className="mt-1 text-sm leading-6 text-app-text italic">{coachMeta.growthMindsetPhrase}</p>
              </div>
            )}

            {coachMeta.nextHook && (
              <div className="rounded-2xl border border-[rgba(214,176,165,0.25)] bg-[rgba(255,250,240,0.5)] px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-muted">继续探索</div>
                <p className="mt-1 text-sm leading-6 text-app-text">{coachMeta.nextHook}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 mt-1 px-1">
          <span className="text-[10px] text-app-muted">{time}</span>
          {!isUser && <span className="text-xs opacity-60">✨</span>}
          {isUser && <span className="text-xs opacity-60">🌿</span>}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageItem;
