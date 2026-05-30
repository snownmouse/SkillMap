import React, { useState, useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { TimelineEvent } from '../../types/skillTree';

interface TimelineViewProps {
  events: TimelineEvent[];
}

const eventTypeConfig = {
  progress: { label: '进度', color: 'text-skill-core', bg: 'bg-skill-core/10' },
  conversation: { label: '对话', color: 'text-skill-specialization', bg: 'bg-skill-specialization/10' },
  unlock: { label: '解锁', color: 'text-status-completed', bg: 'bg-status-completed/10' },
  insight: { label: '洞察', color: 'text-skill-general', bg: 'bg-skill-general/10' },
};

/**
 * 垂直时间线视图
 */
const TimelineView: React.FC<TimelineViewProps> = ({ events }) => {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(Object.keys(eventTypeConfig)));
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (!selectedTypes.has(event.type)) return false;
      if (searchQuery && !event.summary.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [events, selectedTypes, searchQuery]);

  const toggleType = (type: string) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      if (newTypes.size > 1) {
        newTypes.delete(type);
      }
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };

  const clearFilters = () => {
    setSelectedTypes(new Set(Object.keys(eventTypeConfig)));
    setSearchQuery('');
  };

  const hasActiveFilters = selectedTypes.size !== Object.keys(eventTypeConfig).length || searchQuery;

  if (events.length === 0) {
    return (
      <div className="panel-card rounded-[28px] py-20 text-center">
        <div className="text-4xl mb-4">🌱</div>
        <p className="text-app-muted">你的旅程刚刚开始，去学习并与 AI 导师对话吧！</p>
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="panel-card rounded-[28px] py-20 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <p className="text-app-muted">没有找到匹配的事件</p>
        <button onClick={clearFilters} className="mt-4 text-skill-core hover:underline">清除筛选</button>
      </div>
    );
  }

  return (
    <div>
      {/* 筛选栏 */}
      <div className="panel-card rounded-[24px] p-4 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Filter size={16} className="text-app-muted" />
            <div className="flex gap-2 flex-wrap">
              {Object.entries(eventTypeConfig).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedTypes.has(type)
                      ? `${config.bg} ${config.color}`
                      : 'bg-app-surface text-app-muted hover:text-app-text'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="搜索事件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm w-48 focus:outline-none focus:border-skill-core"
            />
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="p-2 rounded-lg hover:bg-app-surface transition-colors"
              >
                <X size={14} className="text-app-muted" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 时间线 */}
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-skill-core/40 before:via-app-border before:to-transparent">
        {filteredEvents.map((event, idx) => {
          const config = eventTypeConfig[event.type as keyof typeof eventTypeConfig] || eventTypeConfig.insight;
          return (
            <div key={`${event.type}-${event.date}-${idx}`} className="relative flex items-start space-x-6 animate-fade-in">
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

              <div className="panel-card-soft flex-1 rounded-3xl p-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-app-muted uppercase tracking-widest">
                    {new Date(event.date).toLocaleDateString()}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${config.bg} ${config.color}`}>
                    {config.label}
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
          );
        })}
      </div>
    </div>
  );
};

export default TimelineView;
