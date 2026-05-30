import React from 'react';
import { AlertTriangle, BookOpen, Bot, Brain, CheckCircle2, Compass, Flag, Hammer, MessageSquare, RefreshCw, Route, Sparkles, Target, X } from 'lucide-react';
import { SkillNode } from '../../types/skillTree';
import { apiClient } from '../../services/apiClient';
import ChatPanel from '../Chat/ChatPanel';
import CollapsibleSection from './CollapsibleSection';
import { useAppContext } from '../../context/AppContext';

interface SkillNodeDetailProps {
  node: SkillNode;
  treeId?: string;
  onClose: () => void;
  onNodeUpdated?: (nodeId: string, data: SkillNode) => void;
}

const SkillNodeDetail: React.FC<SkillNodeDetailProps> = ({ node, treeId, onClose, onNodeUpdated }) => {
  const [showChat, setShowChat] = React.useState(false);
  const { state, dispatch } = useAppContext();
  
  const nodeCache = state.nodeDetailsCache[node.id];
  const isLoading = nodeCache?.isLoading || false;
  const cachedNode = nodeCache?.node || null;

  const currentNode = cachedNode || node;

  const hasCoreInfo = currentNode.id === 'meta_growth' || Boolean(currentNode.description);
  const hasFullDetails = currentNode.id === 'meta_growth' || (
    Boolean(currentNode.description) && (
      (currentNode.resources?.length || 0) > 0 ||
      (currentNode.steps?.length || 0) > 0 ||
      (currentNode.tools?.length || 0) > 0
    )
  );
  const needsDetailsLoad = hasCoreInfo && !hasFullDetails && treeId;

  const handleLoadDetails = async () => {
    if (!treeId || isLoading) {
      console.log(`[handleLoadDetails] 跳过加载: treeId=${treeId}, isLoading=${isLoading}`);
      return;
    }
    
    console.log(`[handleLoadDetails] 开始加载节点详情: ${node.id}`);
    dispatch({ type: 'SET_NODE_DETAIL_LOADING', payload: { nodeId: node.id, isLoading: true } });
    
    try {
      const result = await apiClient.fillNodeDetails(treeId, [node.id]);
      console.log(`[handleLoadDetails] API返回结果: success=${result.success}, hasNodes=${!!result.treeData?.nodes}`);
      
      if (result.success && result.treeData?.nodes?.[node.id]) {
        const newNodeData = result.treeData.nodes[node.id];
        console.log(`[handleLoadDetails] 节点数据更新: hasResources=${!!newNodeData.resources?.length}, hasSteps=${!!newNodeData.steps?.length}, hasTools=${!!newNodeData.tools?.length}`);
        dispatch({ type: 'SET_NODE_DETAIL_DATA', payload: { nodeId: node.id, node: newNodeData } });
        onNodeUpdated?.(node.id, newNodeData);
      } else {
        console.log(`[handleLoadDetails] 数据不完整，重置加载状态`);
        dispatch({ type: 'SET_NODE_DETAIL_LOADING', payload: { nodeId: node.id, isLoading: false } });
      }
    } catch (e) {
      console.error('加载节点详情失败:', e);
      dispatch({ type: 'SET_NODE_DETAIL_LOADING', payload: { nodeId: node.id, isLoading: false } });
    }
  };

  const progressColorClass = currentNode.progress >= 100 ? 'bg-status-completed' : 'bg-status-inProgress';
  const statusLabel = {
    locked: '未解锁',
    available: '可开始',
    in_progress: '进行中',
    completed: '已完成',
  }[currentNode.status];
  const difficultyLabel = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
  }[currentNode.difficulty];
  const bloomLabel = currentNode.bloomLevel ? {
    remember: '记忆',
    understand: '理解',
    apply: '应用',
    analyze: '分析',
    evaluate: '评价',
    create: '创造',
  }[currentNode.bloomLevel] : null;
  const unlockLabel = currentNode.unlockThreshold ? {
    minimum: '达到合格线即可解锁后续节点',
    proficient: '达到熟练水平后解锁后续节点',
    mastery: '需要接近精通后再进入下个节点',
  }[currentNode.unlockThreshold] : null;

  return (
    <div className="panel-card flex h-full w-full flex-col border-l border-app-border shadow-2xl animate-slide-in relative">
      <div className="flex items-start justify-between border-b border-[rgba(214,176,165,0.2)] p-6">
        <div>
          <div className="section-kicker mb-3">技能节点</div>
          <h2 className="text-xl font-bold text-app-text">{currentNode.name}</h2>
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

      {!hasCoreInfo ? (
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
            <div className="mt-2 text-base font-bold text-app-text">{currentNode.estimatedHours} 小时</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-app-muted">当前进度</span>
            <span className="text-status-inProgress font-mono">{currentNode.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-app-bg">
            <div 
              className={`h-full transition-all duration-500 ${progressColorClass}`}
              style={{ width: `${currentNode.progress}%` }}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
            <BookOpen size={14} />
            技能描述
          </h3>
          <p className="text-app-text leading-relaxed">{currentNode.description}</p>
          {currentNode.whyItMatters && (
            <div className="mt-4 rounded-2xl border border-[rgba(214,176,165,0.25)] bg-[rgba(255,250,240,0.7)] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
                <Compass size={14} />
                为什么学它
              </div>
              <p className="text-sm leading-6 text-app-text">{currentNode.whyItMatters}</p>
            </div>
          )}
        </div>

        {(bloomLabel || currentNode.relatedToExisting) && (
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
            {currentNode.relatedToExisting && (
              <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
                  <Route size={14} />
                  与已有能力的连接
                </div>
                <p className="text-sm leading-6 text-app-text">{currentNode.relatedToExisting}</p>
              </div>
            )}
          </div>
        )}

        {(currentNode.learningObjectives?.length || 0) > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
              <Target size={14} />
              本节点要拿下什么
            </h3>
            <div className="space-y-2">
              {currentNode.learningObjectives.map((objective, index) => (
                <div key={`${objective}-${index}`} className="rounded-xl border border-app-border bg-app-surface p-3 text-sm leading-6 text-app-text">
                  {index + 1}. {objective}
                </div>
              ))}
            </div>
          </div>
        )}

        {(currentNode.deliverables?.length || 0) > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
              <Sparkles size={14} />
              完成后应有的成果
            </h3>
            <div className="space-y-2">
              {currentNode.deliverables.map((deliverable, index) => (
                <div key={`${deliverable}-${index}`} className="rounded-xl border border-app-border bg-app-surface p-3 text-sm leading-6 text-app-text">
                  {deliverable}
                </div>
              ))}
            </div>
          </div>
        )}

        {currentNode.masteryCriteria && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
              <Flag size={14} />
              掌握标准
            </h3>
            <div className="space-y-2">
              <div className="rounded-xl border border-app-border bg-app-surface p-3 text-sm leading-6 text-app-text">
                <span className="font-bold">合格线：</span>{currentNode.masteryCriteria.minimum}
              </div>
              <div className="rounded-xl border border-app-border bg-app-surface p-3 text-sm leading-6 text-app-text">
                <span className="font-bold">熟练：</span>{currentNode.masteryCriteria.proficient}
              </div>
              <div className="rounded-xl border border-app-border bg-app-surface p-3 text-sm leading-6 text-app-text">
                <span className="font-bold">精通：</span>{currentNode.masteryCriteria.mastery}
              </div>
              {unlockLabel && (
                <div className="rounded-xl border border-[rgba(232,159,110,0.25)] bg-[rgba(232,159,110,0.08)] p-3 text-sm leading-6 text-app-text">
                  {unlockLabel}
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-app-muted">
            <Flag size={14} />
            完成目标
          </h3>
          <div className="rounded-xl border border-status-completed/30 bg-status-completed/10 p-3">
            <p className="text-sm text-app-text">🎯 {currentNode.milestone}</p>
          </div>
        </div>

        {needsDetailsLoad && (
          <div className="rounded-2xl border border-dashed border-app-border bg-app-surface p-6 text-center">
            <p className="text-sm text-app-muted mb-4">
              查看学习路径、资源推荐、常见卡点等详细信息
            </p>
            <button
              onClick={handleLoadDetails}
              disabled={isLoading}
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? '正在加载详情...' : '加载完整详情'}
            </button>
          </div>
        )}

        {hasFullDetails && (
          <>
            {currentNode.steps && currentNode.steps.length > 0 && (
              <CollapsibleSection title="学习路径" icon={<Route size={14} />}>
                <div className="space-y-3">
                  {currentNode.steps.map((step, index) => (
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
              </CollapsibleSection>
            )}

            {currentNode.subSkills && currentNode.subSkills.length > 0 && (
              <CollapsibleSection title="子技能" icon={<CheckCircle2 size={14} />}>
                <div className="space-y-2">
                  {currentNode.subSkills.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between rounded-xl border border-app-border bg-app-surface p-3">
                      <span className="text-sm text-app-text">
                        {sub.status === 'completed' ? '✅' : '⏳'} {sub.name}
                      </span>
                      <span className="text-xs text-app-muted">{sub.progress}%</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {(currentNode.practiceTips || currentNode.aiPendingMessage || currentNode.latestCoaching) && (
              <div className="space-y-3">
                {currentNode.practiceTips && (
                  <div className="rounded-2xl border border-[rgba(232,159,110,0.2)] bg-[rgba(232,159,110,0.05)] p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-skill-core">
                      <Bot size={14} />
                      刻意练习建议
                    </h3>
                    <p className="text-sm leading-6 text-app-text">{currentNode.practiceTips}</p>
                  </div>
                )}

                {currentNode.latestCoaching && (
                  <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-app-muted">
                      <Brain size={14} />
                      最新教练反馈
                    </div>
                    <div className="space-y-3">
                      {currentNode.latestCoaching.summary && (
                        <p className="text-sm leading-6 text-app-text">{currentNode.latestCoaching.summary}</p>
                      )}
                      {currentNode.latestCoaching.bloomAssessment && (
                        <div className="rounded-xl bg-app-bg px-3 py-2 text-sm text-app-text">
                          当前阶段：{currentNode.latestCoaching.bloomAssessment.currentLevel}，判断依据：{currentNode.latestCoaching.bloomAssessment.evidence}
                        </div>
                      )}
                      {currentNode.latestCoaching.deliberatePracticeTip && (
                        <div className="rounded-xl bg-app-bg px-3 py-2 text-sm text-app-text">
                          练习重点：{currentNode.latestCoaching.deliberatePracticeTip}
                        </div>
                      )}
                      {currentNode.latestCoaching.nextChallenge && (
                        <div className="rounded-xl bg-app-bg px-3 py-2 text-sm text-app-text">
                          下一挑战：{currentNode.latestCoaching.nextChallenge}
                        </div>
                      )}
                      {currentNode.latestCoaching.growthMindsetPhrase && (
                        <div className="text-sm italic text-app-muted">{currentNode.latestCoaching.growthMindsetPhrase}</div>
                      )}
                    </div>
                  </div>
                )}

                {currentNode.aiPendingMessage && (
                  <div className="rounded-2xl border border-[rgba(156,180,179,0.25)] bg-[rgba(156,180,179,0.08)] p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-status-completed">
                      <MessageSquare size={14} />
                      下一次复盘可以从这里开始
                    </h3>
                    <p className="text-sm text-app-text italic">{currentNode.aiPendingMessage}</p>
                  </div>
                )}
              </div>
            )}

            {currentNode.resources && currentNode.resources.length > 0 && (
              <CollapsibleSection title="学习资源" icon={<BookOpen size={14} />}>
                <div className="space-y-2">
                  {currentNode.resources.map((res, idx) => (
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
              </CollapsibleSection>
            )}

            {currentNode.tools && currentNode.tools.length > 0 && (
              <CollapsibleSection title="推荐工具与方法" icon={<Hammer size={14} />}>
                <div className="space-y-2">
                  {currentNode.tools.map((tool, index) => (
                    <div key={`${tool.name}-${index}`} className="rounded-xl border border-app-border bg-app-surface p-3">
                      <div className="text-sm font-bold text-app-text">{tool.name}</div>
                      <p className="mt-1 text-sm leading-6 text-app-muted">{tool.purpose}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {currentNode.microMilestones && currentNode.microMilestones.length > 0 && (
              <CollapsibleSection title="过程里程碑" icon={<CheckCircle2 size={14} />}>
                <div className="space-y-2">
                  {currentNode.microMilestones.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="rounded-xl border border-app-border bg-app-surface p-3">
                      <div className="text-sm font-bold text-app-text">{item.title}</div>
                      <p className="mt-1 text-sm leading-6 text-app-muted">{item.outcome}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {((currentNode.commonProblems && currentNode.commonProblems.length > 0) || (currentNode.pitfalls && currentNode.pitfalls.length > 0)) && (
              <div className="space-y-3">
                {currentNode.commonProblems && currentNode.commonProblems.length > 0 && (
                  <CollapsibleSection title="常见卡点" icon={<AlertTriangle size={14} />}>
                    <div className="space-y-2">
                      {currentNode.commonProblems.map((item, index) => (
                        <div key={`${item.title}-${index}`} className="rounded-xl border border-app-border bg-app-surface p-3">
                          <div className="text-sm font-bold text-app-text">{item.title}</div>
                          <p className="mt-1 text-sm leading-6 text-app-muted">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

                {currentNode.pitfalls && currentNode.pitfalls.length > 0 && (
                  <CollapsibleSection title="高频误区" icon={<AlertTriangle size={14} />}>
                    <div className="space-y-2">
                      {currentNode.pitfalls.map((item, index) => (
                        <div key={`${item.title}-${index}`} className="rounded-xl border border-app-border bg-app-surface p-3">
                          <div className="text-sm font-bold text-app-text">{item.title}</div>
                          <p className="mt-1 text-sm leading-6 text-app-muted">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}
              </div>
            )}
          </>
        )}
      </div>
      )}

      <div className="p-6 border-t border-app-border">
        {!showChat ? (
          <button
            onClick={() => setShowChat(true)}
            disabled={!hasCoreInfo}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-bold transition-all disabled:opacity-50"
          >
            <MessageSquare size={18} />
            记录复盘
          </button>
        ) : (
          <div className="h-[500px] -mx-6 -mb-6">
            <ChatPanel nodeId={node.id} treeId={treeId} onBack={() => setShowChat(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillNodeDetail;
