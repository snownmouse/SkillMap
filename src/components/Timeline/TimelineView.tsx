import React from 'react';
import { TimelineEvent } from '../../types/skillTree';

interface TimelineViewProps {
  events: TimelineEvent[];
}

/**
 * 垂直时间线视图
 */
const TimelineView: React.FC<TimelineViewProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="panel-card rounded-[28px] py-20 text-center">
        <div className="text-4xl mb-4">🌱</div>
        <p className="text-app-muted">你的旅程刚刚开始，去学习并与 AI 导师对话吧！</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-skill-core/40 before:via-app-border before:to-transparent">
      {events.map((event, idx) => (
        <div key={`${event.type}-${event.date}-${idx}`} className="relative flex items-start space-x-6 animate-fade-in">
          {/* 图标 */}
          <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#FDF8F0] ${
            event.type === 'progress' ? 'bg-skill-core' :
            event.type === 'conversation' ? 'bg-skill-specialization' :
            event.type === 'unlock' ? 'bg-status-completed' : 'bg-skill-general'
          }`}>
            <span className="text-sm">
              {event.type === 'progress' ? '📈' :
               event.type === 'conversation' ? '💬' :
               event.type === 'unlock' ? '🔓' : '💡'}
            </span>
          </div>

          {/* 内容卡片 */}
          <div className="panel-card-soft flex-1 rounded-3xl p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-app-muted uppercase tracking-widest">
                {new Date(event.date).toLocaleDateString()}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                event.type === 'progress' ? 'bg-skill-core/10 text-skill-core' :
                event.type === 'conversation' ? 'bg-skill-specialization/10 text-skill-specialization' :
                event.type === 'unlock' ? 'bg-status-completed/10 text-status-completed' : 'bg-skill-general/10 text-skill-general'
              }`}>
                {event.type}
              </span>
            </div>
            <p className="text-app-text font-bold mb-2">{event.summary}</p>
            {event.nodeId && (
              <div className="text-xs text-app-muted">
                关联技能: <span className="text-skill-core">#{event.nodeId}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimelineView;
