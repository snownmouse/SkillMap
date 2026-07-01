import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, FileUp, FolderUp, GitBranch, Radar, Sparkles, Plus } from 'lucide-react';
import { useSkillTree } from '../hooks/useSkillTree';
import { useTaskWebSocket } from '../hooks/useTaskWebSocket';
import SkillTreeCanvas from '../components/SkillTree/SkillTreeCanvas';
import SkillNodeDetail from '../components/SkillTree/SkillNodeDetail';
import AppLayout from '../components/Layout/AppLayout';
import { TreeSwitcher } from '../components/SkillTree/TreeSwitcher';
import { SkillNode } from '../types/skillTree';
import { difyApi } from '../services/difyApi';
import { storage } from '../services/storage';
import { createSkillTreeHtmlReport } from '../utils/skillTreeReport';
import { useAppContext } from '../context/AppContext';

function buildDownloadFileName(career: string, suffix: string, ext: string) {
  const safeCareer = (career || 'skill-tree')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 50);

  return `${safeCareer || 'skill-tree'}-${suffix}.${ext}`;
}

function triggerDownload(blob: Blob, fileName: string) {
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * 技能树主页面
 */
const TreePage: React.FC = () => {
  const navigate = useNavigate();
  const { treeId } = useParams<{ treeId?: string }>();
  const { state } = useAppContext();
  const { skillTree, activeNode, setActiveNode, setSkillTree, setError, updateNodeData } = useSkillTree();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [isExportingPackage, setIsExportingPackage] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [isMapCollapsed, setIsMapCollapsed] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  const handleTreeSelect = (newTreeId: string) => {
    navigate(`/tree/${newTreeId}`);
  };

  const handleCreateNew = () => {
    navigate('/generate');
  };

  const currentUserId = state.auth?.user?.id;

  useEffect(() => {
    const pending = storage.loadPendingTask(currentUserId);
    setPendingTaskId(pending?.taskId || null);
  }, [currentUserId]);

  useTaskWebSocket(pendingTaskId, async (update) => {
    if (update.status === 'node_filled' && update.nodeId && update.nodeData) {
      updateNodeData(update.nodeId, update.nodeData);
      return;
    }

    if (update.status === 'completed' && update.treeId) {
      try {
        const tree = await difyApi.getSkillTreeById(update.treeId);
        setSkillTree(tree);
      } catch {
      } finally {
        storage.clearPendingTask(currentUserId);
        setPendingTaskId(null);
      }
      return;
    }

    if (update.status === 'failed') {
      storage.clearPendingTask(currentUserId);
      setPendingTaskId(null);
      setActionMessage('生成任务已结束（部分节点可能仍为待填充状态）。');
      return;
    }
  });

  useEffect(() => {
    if (!pendingTaskId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const status = await difyApi.getTaskStatus(pendingTaskId);
        if (cancelled) return;
        if (status.status === 'completed' && status.treeId) {
          const tree = await difyApi.getSkillTreeById(status.treeId);
          if (cancelled) return;
          setSkillTree(tree);
          storage.clearPendingTask(currentUserId);
          setPendingTaskId(null);
          return;
        }
        if (status.status === 'failed') {
          storage.clearPendingTask(currentUserId);
          setPendingTaskId(null);
          setActionMessage('生成任务失败，可回到生成页重试。');
          return;
        }
        setTimeout(tick, 10000);
      } catch {
        if (!cancelled) {
          setTimeout(tick, 10000);
        }
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [pendingTaskId, setSkillTree, currentUserId]);

  const handleExportHtml = async () => {
    if (!skillTree || isExportingHtml) return;

    setIsExportingHtml(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const html = createSkillTreeHtmlReport(skillTree);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      triggerDownload(blob, buildDownloadFileName(skillTree.career, 'report', 'html'));
      setError(null);
      setActionMessage('HTML 报告已开始下载，可直接本地打开查看。');
    } catch (e) {
      const message = e instanceof Error ? e.message : '导出 HTML 报告失败';
      setActionError(message);
      setError(message);
    } finally {
      setIsExportingHtml(false);
    }
  };

  const handleExportPackage = async () => {
    if (!skillTree?.id || isExportingPackage) return;

    setIsExportingPackage(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const { blob, fileName } = await difyApi.exportSkillTree(skillTree.id);
      triggerDownload(blob, fileName);
      setError(null);
      setActionMessage('JSON 数据包已开始下载，可用于后续导入恢复。');
    } catch (e) {
      const message = e instanceof Error ? e.message : '导出数据包失败';
      setActionError(message);
      setError(message);
    } finally {
      setIsExportingPackage(false);
    }
  };

  const handleImportClick = () => {
    setActionError(null);
    setActionMessage(null);
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isImporting) return;

    setIsImporting(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const result = await difyApi.importSkillTree(payload);

      setSkillTree(result.data);
      setActiveNode(null);
      storage.saveLastTreeId(result.id, state.auth?.user?.id);
      setError(null);
      setActionMessage(`已导入 ${result.data.career}，正在切换到新技能树。`);
      navigate(`/tree/${result.id}`, { replace: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : '导入技能树失败';
      setActionError(message);
      setError(message);
    } finally {
      event.target.value = '';
      setIsImporting(false);
    }
  };

  const handleExpand = async () => {
    if (!skillTree?.id || isExpanding) return;

    setIsExpanding(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/trees/${skillTree.id}/expand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '展开失败');
      }

      const result = await response.json();
      if (result.data) {
        setSkillTree(result.data);
      }
      setActionMessage(`已展开 ${result.newNodes || 0} 个新节点`);
    } catch (e) {
      const message = e instanceof Error ? e.message : '展开技能树失败';
      setActionError(message);
      setError(message);
    } finally {
      setIsExpanding(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const ensureTreeLoaded = async () => {
      if (treeId && skillTree?.id === treeId) {
        setIsLoading(false);
        storage.saveLastTreeId(treeId, state.auth?.user?.id);
        return;
      }

      if (!treeId && skillTree?.id) {
        setIsLoading(false);
        storage.saveLastTreeId(skillTree.id, state.auth?.user?.id);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        let resolvedTreeId = treeId || storage.loadLastTreeId(state.auth?.user?.id);
        let tree = null;

        if (resolvedTreeId) {
          try {
            tree = await difyApi.getSkillTreeById(resolvedTreeId);
          } catch (e) {
            if (treeId) {
              throw e;
            }
            storage.clearLastTreeId(state.auth?.user?.id);
            resolvedTreeId = null;
          }
        }

        if (!tree) {
          const list = await difyApi.listTrees();
          resolvedTreeId = list.trees[0]?.id || null;
          if (!resolvedTreeId) {
            return;
          }
          tree = await difyApi.getSkillTreeById(resolvedTreeId);
        }
        if (cancelled) return;

        setSkillTree(tree);
        storage.saveLastTreeId(tree.id, state.auth?.user?.id);

        if (!treeId) {
          navigate(`/tree/${tree.id}`, { replace: true });
        }
      } catch (e) {
        if (cancelled) return;

        const message = e instanceof Error ? e.message : '加载技能树失败';
        setLoadError(message);
        setError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    ensureTreeLoaded();

    return () => {
      cancelled = true;
    };
  }, [treeId, skillTree?.id, navigate, setError, setSkillTree, state.auth?.user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-app-text font-bold">正在恢复你的技能树...</p>
          <p className="text-sm text-app-muted">应用会优先加载最近一次使用的数据。</p>
        </div>
      </div>
    );
  }

  if (!skillTree) {
    const isLoggedIn = !!state.auth?.user;
    
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="flex justify-center mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-skill-core/20 bg-skill-core/10">
              <GitBranch size={40} className="text-skill-core" />
            </div>
          </div>
          
          {loadError ? (
            <>
              <p className="text-red-400 text-sm">{loadError}</p>
              {isLoggedIn && (
                <Link to="/generate" className="inline-flex items-center justify-center rounded-xl bg-skill-core px-6 py-3 text-sm font-bold text-black hover:bg-skill-core/80 transition-all">
                  去生成技能树
                </Link>
              )}
            </>
          ) : !isLoggedIn ? (
            <>
              <h2 className="text-2xl font-black text-app-text">登录后查看你的技能树</h2>
              <p className="text-app-muted">登录账号后，你可以生成和管理自己的专属技能成长地图。</p>
              <Link to="/login" className="inline-flex items-center justify-center rounded-xl bg-skill-core px-6 py-3 text-sm font-bold text-black hover:bg-skill-core/80 transition-all">
                登录账号
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black text-app-text">还没有技能树</h2>
              <p className="text-app-muted">开始生成你的第一张专属技能成长地图吧！</p>
              <Link to="/generate" className="inline-flex items-center justify-center rounded-xl bg-skill-core px-6 py-3 text-sm font-bold text-black hover:bg-skill-core/80 transition-all">
                开始生成
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const nodes = Object.values(skillTree.nodes) as SkillNode[];
  const unlockedCount = nodes.filter((node) => node.status !== 'locked').length;
  const completedCount = nodes.filter((node) => node.status === 'completed').length;
  const overallProgress = nodes.length > 0
    ? Math.round(nodes.reduce((sum, node) => sum + (node.progress || 0), 0) / nodes.length)
    : 0;

  return (
    <AppLayout>
      <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden">
        {/* 画布容器 - 确保正确的层叠和裁剪 */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <SkillTreeCanvas
            data={skillTree}
            onNodeClick={(id) => setActiveNode(id)}
          />
        </div>

        {/* 顶部悬浮信息栏 - 响应式布局，在大屏幕上居中并限制最大宽度 */}
        <div className="tree-page-container pointer-events-none absolute left-2 right-2 top-2 sm:left-6 sm:top-6 z-10" style={{ maxWidth: '36rem' }}>
          <div className="tree-page-panel pointer-events-auto flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center gap-3">
              <TreeSwitcher
                currentTreeId={skillTree?.id}
                onTreeSelect={handleTreeSelect}
                onCreateNew={handleCreateNew}
              />
            </div>

            {isMapCollapsed ? (
              <button
                type="button"
                onClick={() => setIsMapCollapsed(false)}
                className="panel-card-soft flex items-center gap-3 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3"
              >
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl border border-app-border bg-app-surface/70 text-skill-core">
                  <ChevronRight size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-app-muted hidden sm:block">成长地图</div>
                  <div className="mt-1 truncate text-xs sm:text-sm font-black text-app-text">{skillTree.career}</div>
                </div>
                <div className="ml-auto text-sm sm:text-base font-black text-skill-core">{overallProgress}%</div>
              </button>
            ) : (
              <div className="panel-card-soft flex flex-col gap-3 sm:gap-4 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4">
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="tree-page-section-kicker section-kicker mb-2 text-xs sm:text-sm">
                      <Sparkles size={12} />
                      成长地图
                    </div>
                    <h1 className="tree-page-title truncate text-base sm:text-xl font-black text-app-text">{skillTree.career}</h1>
                    <p className="tree-page-summary mt-2 text-xs sm:text-sm leading-5 sm:leading-6 text-app-muted line-clamp-2 sm:line-clamp-none">{skillTree.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapCollapsed(true)}
                    className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-app-border bg-app-surface/70 text-app-muted transition-colors hover:text-skill-core"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>

                {skillTree.overallObjective && (
                  <div className="rounded-xl sm:rounded-2xl border border-app-border bg-app-surface/70 px-3 sm:px-4 py-2 sm:py-3 hidden sm:block">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-app-muted">总体目标</div>
                    <p className="mt-2 text-xs sm:text-sm leading-5 sm:leading-6 text-app-text">{skillTree.overallObjective}</p>
                  </div>
                )}
                {skillTree.overallKeyResults && skillTree.overallKeyResults.length > 0 && (
                  <div className="space-y-2 hidden sm:block">
                    {skillTree.overallKeyResults.slice(0, 3).map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-xl border border-app-border bg-app-surface/70 px-3 py-2 text-xs leading-5 text-app-text">
                        KR {index + 1}: {item}
                      </div>
                    ))}
                  </div>
                )}

                <div className="tree-page-stats-card flex items-center gap-3 sm:gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-app-muted mb-1">
                      <Radar size={12} />
                      进度
                    </div>
                    <div className="tree-page-stat-value text-base sm:text-lg font-black text-skill-core">{overallProgress}%</div>
                  </div>
                  <div className="tree-page-divider w-[1px] h-6 sm:h-8 bg-app-border"></div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-app-muted mb-1">
                      <GitBranch size={12} />
                      已解锁
                    </div>
                    <div className="tree-page-stat-value text-base sm:text-lg font-black text-status-completed">{unlockedCount}/{nodes.length}</div>
                  </div>
                  <div className="tree-page-divider w-[1px] h-6 sm:h-8 bg-app-border"></div>
                  <div className="flex flex-col">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-app-muted mb-1">
                      预计周期
                    </div>
                    <div className="tree-page-stat-value text-base sm:text-lg font-black text-app-text">{skillTree.estimatedMonths || '-'} 月</div>
                  </div>
                </div>

                <div className="pointer-events-auto hidden sm:block">
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleExportHtml}
                      disabled={isExportingHtml}
                      className="tree-page-btn-secondary btn-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Download size={14} />
                      {isExportingHtml ? '导出中...' : '导出 HTML'}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPackage}
                      disabled={isExportingPackage}
                      className="tree-page-btn-secondary btn-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FileUp size={14} />
                      {isExportingPackage ? '导出中...' : '导出'}
                    </button>
                    <button
                      type="button"
                      onClick={handleImportClick}
                      disabled={isImporting}
                      className="tree-page-btn-secondary btn-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FolderUp size={14} />
                      {isImporting ? '导入中...' : '导入'}
                    </button>
                    {skillTree.planMeta && (
                      <button
                        type="button"
                        onClick={handleExpand}
                        disabled={isExpanding}
                        className="tree-page-btn-primary btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Plus size={14} />
                        {isExpanding ? '展开中...' : '展开'}
                      </button>
                    )}
                  </div>
                  {(actionError || actionMessage) && (
                    <p className={`mt-3 text-xs ${actionError ? 'text-status-locked' : 'text-status-completed'}`}>
                      {actionError || actionMessage}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 详情面板 */}
        {activeNode && (
          <div className="tree-page-detail-panel absolute inset-y-0 right-0 z-20 w-full sm:w-[400px]">
            <SkillNodeDetail 
              node={activeNode} 
              treeId={treeId || skillTree?.id}
              onClose={() => setActiveNode(null)} 
              onNodeUpdated={(nodeId, updatedNode) => {
                if (skillTree) {
                  setSkillTree({
                    ...skillTree,
                    nodes: { ...skillTree.nodes, [nodeId]: updatedNode }
                  });
                }
              }}
            />
          </div>
        )}

        {/* 底部悬浮提示 - 在手机上隐藏 */}
        <div className="pointer-events-none absolute bottom-4 left-4 sm:left-6 sm:bottom-6 z-10 rounded-xl sm:rounded-2xl border border-app-border bg-app-surface/80 px-3 sm:px-4 py-2 sm:py-3 backdrop-blur-md hidden sm:block">
          <div className="flex items-center gap-2 text-xs text-app-muted">
            <span>💡</span> 点击节点查看详情并记录复盘
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default TreePage;
