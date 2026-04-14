import React from 'react';
import { SkillNode } from '../../types/skillTree';
import ChatPanel from '../Chat/ChatPanel';

interface SkillNodeDetailProps {
  node: SkillNode;
  onClose: () => void;
}

/**
 * 节点详情弹窗（右侧滑出面板）
 */
const SkillNodeDetail: React.FC<SkillNodeDetailProps> = ({ node, onClose }) => {
  const [showChat, setShowChat] = React.useState(false);

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-dark-surface border-l border-dark-border shadow-2xl z-50 animate-slide-in flex flex-col">
      {/* 头部 */}
      <div className="p-6 border-bottom border-dark-border flex justify-between items-center">
        <h2 className="text-xl font-bold text-dark-text">{node.name}</h2>
        <button 
          onClick={onClose}
          className="text-dark-muted hover:text-dark-text transition-colors"
        >
          ✕
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* 进度条 */}
        <div>
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-dark-muted">当前进度</span>
            <span className="text-status-inProgress font-mono">{node.progress}%</span>
          </div>
          <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
            <div 
              className="h-full bg-status-inProgress transition-all duration-500"
              style={{ width: `${node.progress}%` }}
            />
          </div>
        </div>

        {/* 描述 */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-dark-muted mb-2">技能描述</h3>
          <p className="text-dark-text leading-relaxed">{node.description}</p>
        </div>

        {/* 子技能 */}
        {node.subSkills.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-dark-muted mb-3">子技能</h3>
            <div className="space-y-2">
              {node.subSkills.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-2 bg-dark-bg rounded-lg">
                  <span className="text-sm text-dark-text">
                    {sub.status === 'completed' ? '✅' : '⏳'} {sub.name}
                  </span>
                  <span className="text-xs text-dark-muted">{sub.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI 建议 */}
        {node.aiPendingMessage && (
          <div className="p-4 bg-skill-core/10 border border-skill-core/30 rounded-xl">
            <h3 className="text-xs font-bold text-skill-core mb-2 flex items-center">
              <span className="mr-1">💡</span> AI 建议
            </h3>
            <p className="text-sm text-dark-text italic">{node.aiPendingMessage}</p>
          </div>
        )}

        {/* 学习资源 */}
        {node.resources.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-dark-muted mb-3">学习资源</h3>
            <div className="space-y-2">
              {node.resources.map((res, idx) => (
                <a 
                  key={`${res.name}-${res.type}-${idx}`}
                  href={res.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-3 bg-dark-bg hover:bg-dark-border rounded-lg transition-colors group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-dark-text group-hover:text-skill-core">
                      {res.type === 'book' ? '📚' : '🔗'} {res.name}
                    </span>
                    <span className="text-[10px] text-dark-muted uppercase">{res.type}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 目标 */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-dark-muted mb-2">完成目标</h3>
          <div className="p-3 bg-status-completed/10 border border-status-completed/30 rounded-lg">
            <p className="text-sm text-dark-text">🎯 {node.milestone}</p>
          </div>
        </div>
      </div>

      {/* 对话入口 */}
      <div className="p-6 border-t border-dark-border">
        {!showChat ? (
          <button 
            onClick={() => setShowChat(true)}
            className="w-full py-3 bg-skill-core hover:bg-skill-core/80 text-white rounded-xl font-bold transition-all flex items-center justify-center"
          >
            <span className="mr-2">💬</span> 开始对话
          </button>
        ) : (
          <div className="h-[400px] -mx-6 -mb-6">
            <ChatPanel nodeId={node.id} onBack={() => setShowChat(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillNodeDetail;
