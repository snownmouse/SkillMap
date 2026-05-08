import React from 'react';
import { AlertTriangle, BookOpen, Bot, Brain, CheckCircle2, Compass, Flag, Hammer, MessageSquare, Route, Sparkles, Target, X } from 'lucide-react';
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
  const isFilled = node.id === 'meta_growth' || (
    Boolean(node.description) && (
      (node.microMilestones?.length || 0) > 0 ||
      (node.resources?.length || 0) > 0 ||
      (node.steps?.length || 0) > 0
    )
  );
  const progressColorClass = node.progress >= 100 ? 'bg-status-completed' : 'bg-status-inProgress';
  const statusLabel = {
    locked: '未解锁',
    available: '可开始',
    in_progress: '进行中',
    completed: '已完成',
  }[node.status];
  const difficultyLabel = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
  }[node.difficulty];
  const bloomLabel = node.bloomLevel ? {
    remember: '记忆',
    understand: '理解',
    apply: '应用',
    analyze: '分析',
    evaluate: '评价',
    create: '创造',
  }[node.bloomLevel] : null;
  const unlockLabel = node.unlockThreshold ? {
    minimum: '达到合格线即可解锁后续节点',
    proficient: '达到熟练水平后解锁后续节点',
    mastery: '需要接近精通后再进入下个节点',
  }[node.unlockThreshold] : null;

  return (
    <div className="panel-card flex h-full w-full flex-col border-l border-app-border shadow-2xl animate-slide-in relative">
      {/* 头部 */}
      <div className="flex items-start justify-between border-b border-[rgba(214,176,165,0.2)] p-6">
        <div>
          <div className="section-kicker mb-3">技能节点</div>
          <h2 className="text-xl font-bold text-app-text">{node.name}</h2>
          <p className="mt-2 text-sm text-app-muted">
            当前状态：<span className="font-bold text-app-text">{statusLabel}</span>
          </p>
        </div>
        <button 
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(214,176,165,0.15)] text-app-muted transition-all hover:bg-[rgba(214,176,165,0.3)] hover:text-app-text hover:rotate-90"
        >
          <X size={16} />
        </button>
      </div>

      {/* 内容区 */}
      {!isFilled ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-2xl border border-app-border bg-app-surface p-6 text-center">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-app-bg rounded w-3/4 mx-auto" />
              <div className="h-4 bg-app-bg rounded w-1/2 mx-auto" />
              <div className="h-4 bg-app-bg rounded w-2/3 mx-auto" />
            </div>
            <p className="mt-5 text-sm text-app-muted">
              该节点详情正在生成中...
            </p>
          </div>
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-app-border bg-app-surface p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-app-muted">难度</div>
            <div className="mt-2 text-base font-bold text-app-text">{difficultyLabel}</div>
          </div>
          <div className="rounded-2xl border border-app-border bg-app-surface p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-app-muted">预计投入</div>
            <div className="mt-2 text-base font-bold text-app-text">{node.estimatedHours} 小时</div>
          </div>
        </div>

        {/* 进度条 */}
        <div>
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-app-muted">当前进度</span>
            <span className="text-status-inProgress font-mono">{node.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-app-bg">
            <div 
              className={`h-full transition-all duration-500 ${progressColorClass}`}
              style={{ width: `${node.progress}%` }}
            />
          </div>
        </div>

        {/* 描述 */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
            <BookOpen size={14} />
            技能描述
          </h3>
          <p className="text-app-text leading-relaxed">{node.description}</p>
          {node.whyItMatters && (
            <div className="mt-4 rounded-2xl border border-[rgba(214,176,165,0.25)] bg-[rgba(255,250,240,0.7)] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
                <Compass size={14} />
                为什么学它
              </div>
              <p className="text-sm leading-6 text-app-text">{node.whyItMatters}</p>
            </div>
          )}
        </div>

        {(bloomLabel || node.relatedToExisting) && (
          <div className="grid gap-3">
            {bloomLabel && (
              <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
                  <Brain size={14} />
                  当前认知层级
                </div>
                <div className="text-sm font-bold text-app-text">{bloomLabel}</div>
              </div>
            )}
            {node.relatedToExisting && (
              <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
                  <Route size={14} />
                  与已有能力的连接
                </div>
                <p className="text-sm leading-6 text-app-text">{node.relatedToExisting}</p>
              </div>
            )}
          </div>
        )}

        {(node.learningObjectives?.length || 0) > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
              <Target size={14} />
              本节点要拿下什么
            </h3>
            <div className="space-y-2">
              {node.learningObjectives.map((objective, index) => (
                <div key={`${objective}-${index}`} className="rounded-xl border border-app-border bg-app-surface p-3 text-sm leading-6 text-app-text">
                  {index + 1}. {objective}
                </div>
              ))}
            </div>
          </div>
        )}

        {node.steps && node.steps.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
              <Route size={14} />
              学习路径
            </h3>
            <div className="space-y-3">
              {node.steps.map((step, index) => (
                <div key={`${step.title}-${index}`} className="rounded-2xl border border-app-border bg-app-surface p-4">
                  <div className="text-sm font-bold text-app-text">{index + 1}. {step.title}</div>
                  <p className="mt-2 text-sm leading-6 text-app-muted">{step.description}</p>
                  {step.output && (
                    <div className="mt-3 rounded-xl bg-app-bg px-3 py-2 text-xs text-app-text">
                      阶段产出：{step.output}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(node.deliverables?.length || 0) > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
              <Sparkles size={14} />
              完成后应有的成果
            </h3>
            <div className="space-y-2">
              {node.deliverables.map((deliverable, index) => (
                <div key={`${deliverable}-${index}`} className="rounded-xl border border-app-border bg-app-surface p-3 text-sm leading-6 text-app-text">
                  {deliverable}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 子技能 */}
        {node.subSkills.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
              <CheckCircle2 size={14} />
              子技能
            </h3>
            <div className="space-y-2">
              {node.subSkills.map(sub => (
                <div key={sub.id} className="flex items-center justify-between rounded-xl border border-app-border bg-app-surface p-3">
                  <span className="text-sm text-app-text">
                    {sub.status === 'completed' ? '✅' : '⏳'} {sub.name}
                  </span>
                  <span className="text-xs text-app-muted">{sub.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(node.practiceTips || node.aiPendingMessage || node.latestCoaching) && (
          <div className="space-y-3">
            {node.practiceTips && (
              <div className="rounded-2xl border border-[rgba(232,159,110,0.2)] bg-[rgba(232,159,110,0.05)] p-4">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-skill-core">
                  <Bot size={14} />
                  刻意练习建议
                </h3>
                <p className="text-sm leading-6 text-app-text">{node.practiceTips}</p>
              </div>
            )}

            {node.latestCoaching && (
              <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-app-muted">
                  <Brain size={14} />
                  最新教练反馈
                </div>
                <div className="space-y-3">
                  {node.latestCoaching.summary && (
                    <p className="text-sm leading-6 text-app-text">{node.latestCoaching.summary}</p>
                  )}
                  {node.latestCoaching.bloomAssessment && (
                    <div className="rounded-xl bg-app-bg px-3 py-2 text-sm text-app-text">
                      当前阶段：{node.latestCoaching.bloomAssessment.currentLevel}，判断依据：{node.latestCoaching.bloomAssessment.evidence}
                    </div>
                  )}
                  {node.latestCoaching.deliberatePracticeTip && (
                    <div className="rounded-xl bg-app-bg px-3 py-2 text-sm text-app-text">
                      练习重点：{node.latestCoaching.deliberatePracticeTip}
                    </div>
                  )}
                  {node.latestCoaching.nextChallenge && (
                    <div className="rounded-xl bg-app-bg px-3 py-2 text-sm text-app-text">
                      下一挑战：{node.latestCoaching.nextChallenge}
                    </div>
                  )}
                  {node.latestCoaching.growthMindsetPhrase && (
                    <div className="text-sm italic text-app-muted">{node.latestCoaching.growthMindsetPhrase}</div>
                  )}
                </div>
              </div>
            )}

            {node.aiPendingMessage && (
              <div className="rounded-2xl border border-[rgba(156,180,179,0.25)] bg-[rgba(156,180,179,0.08)] p-4">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-status-completed">
                  <MessageSquare size={14} />
                  下一次复盘可以从这里开始
                </h3>
                <p className="text-sm text-app-text italic">{node.aiPendingMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* 学习资源 */}
        {node.resources.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
              <BookOpen size={14} />
              学习资源
            </h3>
            <div className="space-y-2">
              {node.resources.map((res, idx) => (
                <a 
                  key={`${res.name}-${res.type}-${idx}`}
                  href={res.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block rounded-xl border border-app-border bg-app-surface p-3 transition-colors hover:bg-app-border"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-app-text group-hover:text-skill-core">
                      {res.type === 'book' ? '📚' : '🔗'} {res.name}
                    </span>
                    <span className="text-[10px] text-app-muted uppercase">{res.type}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {node.tools && node.tools.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
              <Hammer size={14} />
              推荐工具与方法
            </h3>
            <div className="space-y-2">
              {node.tools.map((tool, index) => (
                <div key={`${tool.name}-${index}`} className="rounded-xl border border-app-border bg-app-surface p-3">
                  <div className="text-sm font-bold text-app-text">{tool.name}</div>
                  <p className="mt-1 text-sm leading-6 text-app-muted">{tool.purpose}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {node.microMilestones && node.microMilestones.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
              <CheckCircle2 size={14} />
              过程里程碑
            </h3>
            <div className="space-y-2">
              {node.microMilestones.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-xl border border-app-border bg-app-surface p-3">
                  <div className="text-sm font-bold text-app-text">{item.title}</div>
                  <p className="mt-1 text-sm leading-6 text-app-muted">{item.outcome}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {node.masteryCriteria && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
              <Flag size={14} />
              掌握标准
            </h3>
            <div className="space-y-2">
              <div className="rounded-xl border border-app-border bg-app-surface p-3 text-sm leading-6 text-app-text">
                <span className="font-bold">合格线：</span>{node.masteryCriteria.minimum}
              </div>
              <div className="rounded-xl border border-app-border bg-app-surface p-3 text-sm leading-6 text-app-text">
                <span className="font-bold">熟练：</span>{node.masteryCriteria.proficient}
              </div>
              <div className="rounded-xl border border-app-border bg-app-surface p-3 text-sm leading-6 text-app-text">
                <span className="font-bold">精通：</span>{node.masteryCriteria.mastery}
              </div>
              {unlockLabel && (
                <div className="rounded-xl border border-[rgba(232,159,110,0.25)] bg-[rgba(232,159,110,0.08)] p-3 text-sm leading-6 text-app-text">
                  {unlockLabel}
                </div>
              )}
            </div>
          </div>
        )}

        {((node.commonProblems && node.commonProblems.length > 0) || (node.pitfalls && node.pitfalls.length > 0)) && (
          <div className="grid gap-3">
            {node.commonProblems && node.commonProblems.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
                  <AlertTriangle size={14} />
                  常见卡点
                </h3>
                <div className="space-y-2">
                  {node.commonProblems.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="rounded-xl border border-app-border bg-app-surface p-3">
                      <div className="text-sm font-bold text-app-text">{item.title}</div>
                      <p className="mt-1 text-sm leading-6 text-app-muted">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {node.pitfalls && node.pitfalls.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
                  <AlertTriangle size={14} />
                  高频误区
                </h3>
                <div className="space-y-2">
                  {node.pitfalls.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="rounded-xl border border-app-border bg-app-surface p-3">
                      <div className="text-sm font-bold text-app-text">{item.title}</div>
                      <p className="mt-1 text-sm leading-6 text-app-muted">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 目标 */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
            <Flag size={14} />
            完成目标
          </h3>
          <div className="rounded-xl border border-status-completed/30 bg-status-completed/10 p-3">
            <p className="text-sm text-app-text">🎯 {node.milestone}</p>
          </div>
        </div>
      </div>
      )}

      {/* 对话入口 */}
      <div className="p-6 border-t border-app-border">
        {!showChat ? (
          <button 
            onClick={() => setShowChat(true)}
            disabled={!isFilled}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-bold transition-all"
          >
            <MessageSquare size={18} />
            记录复盘
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
