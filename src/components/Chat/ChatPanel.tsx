import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatMessageItem from './ChatMessage';
import ChatInput from './ChatInput';
import { apiClient } from '../../services/apiClient';
import { useAppContext } from '../../context/AppContext';
import { BookOpen, Lightbulb, MessageSquare, Sparkles } from 'lucide-react';

interface ChatPanelProps {
  nodeId: string;
  treeId?: string;
  onBack?: () => void;
}

type TabType = 'chat' | 'summary' | 'suggestions';

const ChatPanel: React.FC<ChatPanelProps> = ({ nodeId, treeId, onBack }) => {
  const { chatSessions, isSending, loadHistory, sendMessage } = useChat();
  const { state } = useAppContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [summary, setSummary] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [summaryVersion, setSummaryVersion] = useState(0);
  const [suggestionsVersion, setSuggestionsVersion] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const session = chatSessions[nodeId];
  const messages = session?.messages || [];
  const aiPendingMessage = state.skillTree?.nodes[nodeId]?.aiPendingMessage;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending(nodeId)]);

  useEffect(() => {
    if (messages.length === 0 && !isLoadingHistory) {
      setIsLoadingHistory(true);
      loadHistory(nodeId).finally(() => {
        setIsLoadingHistory(false);
      });
    }
  }, [loadHistory, nodeId, messages.length]);

  useEffect(() => {
    if (activeTab === 'summary' && treeId && !isLoadingSummary) {
      setIsLoadingSummary(true);
      apiClient.getChatSummary(treeId, nodeId)
        .then(data => setSummary(data))
        .catch(() => setSummary(null))
        .finally(() => setIsLoadingSummary(false));
    }
  }, [activeTab, treeId, nodeId, summaryVersion]);

  useEffect(() => {
    if (activeTab === 'suggestions' && treeId && !isLoadingSuggestions) {
      setIsLoadingSuggestions(true);
      apiClient.getLearningSuggestions(treeId, nodeId)
        .then(data => setSuggestions(data))
        .catch(() => setSuggestions(null))
        .finally(() => setIsLoadingSuggestions(false));
    }
  }, [activeTab, treeId, nodeId, suggestionsVersion]);

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'chat', label: '对话', icon: <MessageSquare size={14} /> },
    { key: 'summary', label: '摘要', icon: <BookOpen size={14} /> },
    { key: 'suggestions', label: '建议', icon: <Lightbulb size={14} /> },
  ];

  const handleSend = (content: string) => {
    sendMessage(nodeId, content);
    setSummary(null);
    setSuggestions(null);
    setSummaryVersion(v => v + 1);
    setSuggestionsVersion(v => v + 1);
  };

  return (
    <div className="flex flex-col h-full bg-app-bg">
      {onBack && (
        <div className="flex items-center border-b border-app-border bg-app-surface/90 p-3">
          <button
            onClick={onBack}
            className="mr-2 rounded-lg px-2 py-1 text-app-muted transition-colors hover:bg-app-surface hover:text-app-text"
          >
            ←
          </button>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-app-text">Growth Journal</span>
        </div>
      )}

      <div className="flex border-b border-app-border bg-app-surface/50">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab.key
                ? 'text-skill-core border-b-2 border-skill-core bg-app-bg/50'
                : 'text-app-muted hover:text-app-text'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chat' && (
          <div ref={scrollRef} className="p-4 space-y-4 h-full overflow-y-auto">
            {messages.length === 0 && !isLoadingHistory && !isSending(nodeId) && (
              <div className="panel-card-soft rounded-2xl px-4 py-6 text-center">
                <p className="text-sm italic text-app-muted">
                  🌱 这是你的专属成长日记，你可以问我任何问题...
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} />
            ))}

            {isSending(nodeId) && (
              <div className="flex justify-start">
                <div className="bg-[rgba(255,250,240,0.6)] border border-[rgba(214,176,165,0.2)] p-3 rounded-[2px] rounded-br-[20px] shadow-sm">
                  <div className="flex flex-col gap-1 items-start">
                    <div className="flex space-x-1.5 items-center h-4">
                      <div className="w-1.5 h-1.5 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-app-muted mt-1 italic font-hand">正在为你描绘路径...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="p-4 space-y-4">
            {isLoadingSummary && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-app-muted">正在生成复盘摘要...</span>
                </div>
              </div>
            )}
            {!isLoadingSummary && !summary && (
              <div className="rounded-2xl border border-app-border bg-app-surface p-6 text-center">
                <p className="text-sm text-app-muted">暂无复盘摘要，先和 AI 对话记录你的学习过程吧</p>
              </div>
            )}
            {!isLoadingSummary && summary && summary.message && !summary.summary && (
              <div className="rounded-2xl border border-app-border bg-app-surface p-6 text-center">
                <p className="text-sm text-app-muted">{summary.message}</p>
              </div>
            )}
            {!isLoadingSummary && summary && summary.summary && (
              <>
                <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-app-muted">
                    <BookOpen size={14} />
                    核心要点
                  </div>
                  <p className="text-sm leading-7 text-app-text">{summary.summary}</p>
                </div>

                {summary.keyInsights?.length > 0 && (
                  <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-app-muted">
                      <Sparkles size={14} />
                      关键洞察
                    </div>
                    <div className="space-y-2">
                      {summary.keyInsights.map((insight: string, i: number) => (
                        <div key={i} className="rounded-xl bg-app-bg px-3 py-2 text-sm text-app-text">
                          💡 {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.actionItems?.length > 0 && (
                  <div className="rounded-2xl border border-[rgba(232,159,110,0.25)] bg-[rgba(232,159,110,0.08)] p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-skill-core">
                      <Lightbulb size={14} />
                      行动项
                    </div>
                    <div className="space-y-2">
                      {summary.actionItems.map((item: string, i: number) => (
                        <div key={i} className="rounded-xl bg-app-bg px-3 py-2 text-sm text-app-text">
                          ✅ {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.emotionalState && (
                  <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-app-muted">
                      情感状态
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-app-bg px-3 py-1 text-xs font-bold text-app-text">
                        {summary.emotionalState.primary}
                      </span>
                      {summary.emotionalState.intensity && (
                        <span className="text-xs text-app-muted">强度: {summary.emotionalState.intensity}</span>
                      )}
                    </div>
                    {summary.emotionalState.evidence && (
                      <p className="mt-2 text-xs text-app-muted italic">{summary.emotionalState.evidence}</p>
                    )}
                  </div>
                )}

                {summary.bloomAssessment && (
                  <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-app-muted">
                      Bloom 认知评估
                    </div>
                    <div className="text-sm font-bold text-app-text">{summary.bloomAssessment.currentLevel}</div>
                    <p className="mt-1 text-xs text-app-muted">{summary.bloomAssessment.evidence}</p>
                    {summary.bloomAssessment.progression && (
                      <p className="mt-1 text-xs text-status-inProgress">📈 {summary.bloomAssessment.progression}</p>
                    )}
                  </div>
                )}

                {summary.growthMindset && (
                  <div className="rounded-2xl border border-[rgba(156,180,179,0.35)] bg-[rgba(156,180,179,0.12)] p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-status-completed">
                      成长型思维
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="rounded-full bg-app-bg px-3 py-1 text-xs font-bold text-app-text">
                        {summary.growthMindset.type === 'growth' ? '🌱 成长型' : summary.growthMindset.type === 'fixed' ? '🔒 固定型' : '🔄 混合型'}
                      </span>
                    </div>
                    {summary.growthMindset.growthSignals?.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {summary.growthMindset.growthSignals.map((s: string, i: number) => (
                          <p key={i} className="text-xs text-status-completed">✅ {s}</p>
                        ))}
                      </div>
                    )}
                    {summary.growthMindset.fixedSignals?.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {summary.growthMindset.fixedSignals.map((s: string, i: number) => (
                          <p key={i} className="text-xs text-app-muted">⚠️ {s}</p>
                        ))}
                      </div>
                    )}
                    {summary.growthMindset.coachingPrompts?.length > 0 && (
                      <div className="space-y-1">
                        {summary.growthMindset.coachingPrompts.map((p: string, i: number) => (
                          <p key={i} className="text-xs text-app-text italic">💬 {p}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {summary.nextSteps && (
                  <div className="rounded-2xl border border-[rgba(232,159,110,0.25)] bg-[rgba(232,159,110,0.08)] p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-skill-core">
                      下一步建议
                    </div>
                    {summary.nextSteps.focusAreas?.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {summary.nextSteps.focusAreas.map((a: string, i: number) => (
                          <p key={i} className="text-sm text-app-text">🎯 {a}</p>
                        ))}
                      </div>
                    )}
                    {summary.nextSteps.warningSigns?.length > 0 && (
                      <div className="space-y-1">
                        {summary.nextSteps.warningSigns.map((w: string, i: number) => (
                          <p key={i} className="text-xs text-app-muted">⚠️ {w}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="p-4 space-y-4">
            {isLoadingSuggestions && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-app-muted">正在生成学习建议...</span>
                </div>
              </div>
            )}
            {!isLoadingSuggestions && !suggestions && (
              <div className="rounded-2xl border border-app-border bg-app-surface p-6 text-center">
                <p className="text-sm text-app-muted">暂无学习建议，先和 AI 对话记录你的学习过程吧</p>
              </div>
            )}
            {!isLoadingSuggestions && suggestions && (
              <>
                {suggestions.currentStatus && (
                  <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-app-muted">
                      当前状态
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="rounded-xl bg-app-bg px-3 py-2">
                        <div className="text-[10px] text-app-muted">认知层级</div>
                        <div className="text-sm font-bold text-app-text">{suggestions.currentStatus.bloomLevel}</div>
                      </div>
                      <div className="rounded-xl bg-app-bg px-3 py-2">
                        <div className="text-[10px] text-app-muted">进度</div>
                        <div className="text-sm font-bold text-status-inProgress">{suggestions.currentStatus.progress}%</div>
                      </div>
                    </div>
                    {suggestions.currentStatus.strengths?.length > 0 && (
                      <div className="mb-2">
                        <div className="text-[10px] uppercase tracking-wider text-app-muted mb-1">优势</div>
                        {suggestions.currentStatus.strengths.map((s: string, i: number) => (
                          <p key={i} className="text-xs text-status-completed">💪 {s}</p>
                        ))}
                      </div>
                    )}
                    {suggestions.currentStatus.areasForGrowth?.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-app-muted mb-1">待提升</div>
                        {suggestions.currentStatus.areasForGrowth.map((a: string, i: number) => (
                          <p key={i} className="text-xs text-skill-core">📈 {a}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {suggestions.suggestions?.length > 0 && (
                  <div className="rounded-2xl border border-[rgba(232,159,110,0.25)] bg-[rgba(232,159,110,0.08)] p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-skill-core">
                      <Lightbulb size={14} />
                      学习建议
                    </div>
                    <div className="space-y-3">
                      {suggestions.suggestions.map((s: any, i: number) => (
                        <div key={i} className="rounded-xl border border-app-border bg-app-surface p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              s.priority === 'high' ? 'bg-red-100 text-red-700' :
                              s.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {s.priority}
                            </span>
                            <span className="text-[10px] text-app-muted uppercase">{s.type}</span>
                          </div>
                          <div className="text-sm font-bold text-app-text">{s.title}</div>
                          <p className="mt-1 text-xs text-app-muted">{s.description}</p>
                          {s.actionItems?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {s.actionItems.map((a: string, j: number) => (
                                <p key={j} className="text-xs text-app-text">→ {a}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {suggestions.nextMilestone && (
                  <div className="rounded-2xl border border-[rgba(156,180,179,0.35)] bg-[rgba(156,180,179,0.12)] p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-status-completed">
                      <Sparkles size={14} />
                      下一个里程碑
                    </div>
                    <div className="text-sm font-bold text-app-text">{suggestions.nextMilestone.name}</div>
                    <p className="mt-1 text-xs text-app-muted">{suggestions.nextMilestone.description}</p>
                    {suggestions.nextMilestone.estimatedTime && (
                      <p className="mt-1 text-xs text-app-muted">⏱ 预计 {suggestions.nextMilestone.estimatedTime}</p>
                    )}
                    {suggestions.nextMilestone.practiceFocus && (
                      <p className="mt-1 text-xs text-skill-core">🎯 练习重点: {suggestions.nextMilestone.practiceFocus}</p>
                    )}
                  </div>
                )}

                {suggestions.spacedRepetitionPlan && (
                  <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-app-muted">
                      间隔重复计划
                    </div>
                    <div className="space-y-2">
                      {suggestions.spacedRepetitionPlan.reviewNow?.length > 0 && (
                        <div className="rounded-xl bg-app-bg px-3 py-2">
                          <div className="text-[10px] font-bold text-app-muted">现在复习</div>
                          {suggestions.spacedRepetitionPlan.reviewNow.map((r: string, i: number) => (
                            <p key={i} className="text-xs text-app-text">📌 {r}</p>
                          ))}
                        </div>
                      )}
                      {suggestions.spacedRepetitionPlan.reviewIn1Day?.length > 0 && (
                        <div className="rounded-xl bg-app-bg px-3 py-2">
                          <div className="text-[10px] font-bold text-app-muted">1天后</div>
                          {suggestions.spacedRepetitionPlan.reviewIn1Day.map((r: string, i: number) => (
                            <p key={i} className="text-xs text-app-text">📅 {r}</p>
                          ))}
                        </div>
                      )}
                      {suggestions.spacedRepetitionPlan.reviewIn3Days?.length > 0 && (
                        <div className="rounded-xl bg-app-bg px-3 py-2">
                          <div className="text-[10px] font-bold text-app-muted">3天后</div>
                          {suggestions.spacedRepetitionPlan.reviewIn3Days.map((r: string, i: number) => (
                            <p key={i} className="text-xs text-app-text">📅 {r}</p>
                          ))}
                        </div>
                      )}
                      {suggestions.spacedRepetitionPlan.reviewIn7Days?.length > 0 && (
                        <div className="rounded-xl bg-app-bg px-3 py-2">
                          <div className="text-[10px] font-bold text-app-muted">7天后</div>
                          {suggestions.spacedRepetitionPlan.reviewIn7Days.map((r: string, i: number) => (
                            <p key={i} className="text-xs text-app-text">📅 {r}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {suggestions.practicePlan?.exercises?.length > 0 && (
                  <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-app-muted">
                      练习计划
                    </div>
                    <div className="space-y-2">
                      {suggestions.practicePlan.exercises.map((e: any, i: number) => (
                        <div key={i} className="rounded-xl border border-app-border bg-app-bg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-app-text">{e.name}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              e.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              e.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {e.difficulty}
                            </span>
                          </div>
                          <p className="text-xs text-app-muted">{e.description}</p>
                          {e.feedback && (
                            <p className="mt-1 text-xs text-skill-core">反馈: {e.feedback}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {suggestions.practicePlan.cognitiveLoadNote && (
                      <p className="mt-2 text-xs text-app-muted italic">{suggestions.practicePlan.cognitiveLoadNote}</p>
                    )}
                  </div>
                )}

                {suggestions.avoidPitfalls?.length > 0 && (
                  <div className="rounded-2xl border border-[rgba(214,176,165,0.25)] bg-[rgba(214,176,165,0.08)] p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-app-muted">
                      ⚠️ 避坑指南
                    </div>
                    <div className="space-y-2">
                      {suggestions.avoidPitfalls.map((p: any, i: number) => (
                        <div key={i} className="rounded-xl bg-app-bg px-3 py-2">
                          <div className="text-xs font-bold text-app-text">❌ {p.pitfall}</div>
                          <p className="text-xs text-app-muted">✅ {p.howToAvoid}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {suggestions.motivationMessage && (
                  <div className="rounded-2xl border border-[rgba(156,180,179,0.35)] bg-[rgba(156,180,179,0.12)] p-4 text-center">
                    <p className="text-sm italic text-app-text">{suggestions.motivationMessage}</p>
                  </div>
                )}

                {suggestions.overallOKR && (
                  <>
                    <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-app-muted">
                        本周 OKR
                      </div>
                      <div className="text-sm font-bold text-app-text">{suggestions.overallOKR.objective}</div>
                      {suggestions.overallOKR.keyResults?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {suggestions.overallOKR.keyResults.map((kr: string, i: number) => (
                            <p key={i} className="text-xs text-app-text">🎯 {kr}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    {suggestions.weeklyPlan && (
                      <div className="rounded-2xl border border-[rgba(232,159,110,0.25)] bg-[rgba(232,159,110,0.08)] p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-skill-core">
                          周计划 (PDCA)
                        </div>
                        <div className="mb-2">
                          <div className="text-[10px] font-bold text-app-muted">Plan</div>
                          <p className="text-xs text-app-text">{suggestions.weeklyPlan.plan}</p>
                        </div>
                        {suggestions.weeklyPlan.do && (
                          <div className="mb-2 space-y-1">
                            {Object.entries(suggestions.weeklyPlan.do).map(([day, tasks]: [string, any]) => (
                              <div key={day} className="rounded-xl bg-app-bg px-3 py-1.5">
                                <span className="text-[10px] font-bold text-app-muted uppercase">{day}</span>
                                <span className="text-xs text-app-text ml-2">{Array.isArray(tasks) ? tasks.join(', ') : tasks}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {suggestions.weeklyPlan.check && (
                          <div className="mb-1">
                            <div className="text-[10px] font-bold text-app-muted">Check</div>
                            <p className="text-xs text-app-text">{suggestions.weeklyPlan.check}</p>
                          </div>
                        )}
                        {suggestions.weeklyPlan.act && (
                          <div>
                            <div className="text-[10px] font-bold text-app-muted">Act</div>
                            <p className="text-xs text-app-text">{suggestions.weeklyPlan.act}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {suggestions.nextChallenges?.length > 0 && (
                      <div className="rounded-2xl border border-[rgba(156,180,179,0.35)] bg-[rgba(156,180,179,0.12)] p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-status-completed">
                          推荐挑战
                        </div>
                        <div className="space-y-2">
                          {suggestions.nextChallenges.map((c: any, i: number) => (
                            <div key={i} className="rounded-xl bg-app-bg px-3 py-2">
                              <div className="text-xs font-bold text-app-text">{c.reason}</div>
                              <p className="text-[10px] text-app-muted">预估 {c.estimatedHours}h</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {suggestions.motivationMessage && (
                      <div className="rounded-2xl border border-[rgba(156,180,179,0.35)] bg-[rgba(156,180,179,0.12)] p-4 text-center">
                        <p className="text-sm italic text-app-text">{suggestions.motivationMessage}</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {activeTab === 'chat' && (
        <div className="border-t border-app-border bg-app-surface/90 p-4">
          <ChatInput
            onSend={handleSend}
            disabled={isSending(nodeId)}
            aiPendingMessage={aiPendingMessage}
          />
        </div>
      )}
    </div>
  );
};

export default ChatPanel;
