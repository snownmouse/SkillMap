import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, FileUp, FolderUp, GitBranch, Radar, Sparkles } from 'lucide-react';
import { useSkillTree } from '../hooks/useSkillTree';
import { useTaskWebSocket } from '../hooks/useTaskWebSocket';
import SkillTreeCanvas from '../components/SkillTree/SkillTreeCanvas';
import SkillNodeDetail from '../components/SkillTree/SkillNodeDetail';
import AppLayout from '../components/Layout/AppLayout';
import { SkillNode } from '../types/skillTree';
import { difyApi } from '../services/difyApi';
import { storage } from '../services/storage';
import { createSkillTreeHtmlReport } from '../utils/skillTreeReport';

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

  useEffect(() => {
    const pending = storage.loadPendingTask();
    setPendingTaskId(pending?.taskId || null);
  }, []);

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
        storage.clearPendingTask();
        setPendingTaskId(null);
      }
      return;
    }

    if (update.status === 'failed') {
      storage.clearPendingTask();
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
          storage.clearPendingTask();
          setPendingTaskId(null);
          return;
        }
        if (status.status === 'failed') {
          storage.clearPendingTask();
          setPendingTaskId(null);
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
  }, [pendingTaskId, setSkillTree]);

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
      storage.saveLastTreeId(result.id);
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

  useEffect(() => {
    let cancelled = false;

    const ensureTreeLoaded = async () => {
      if (treeId && skillTree?.id === treeId) {
        setIsLoading(false);
        storage.saveLastTreeId(treeId);
        return;
      }

      if (!treeId && skillTree?.id) {
        setIsLoading(false);
        storage.saveLastTreeId(skillTree.id);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        let resolvedTreeId = treeId || storage.loadLastTreeId();

        if (!resolvedTreeId) {
          const list = await difyApi.listTrees();
          resolvedTreeId = list.trees[0]?.id || null;
        }

        if (!resolvedTreeId) {
          return;
        }

        const tree = await difyApi.getSkillTreeById(resolvedTreeId);
        if (cancelled) return;

        setSkillTree(tree);
        storage.saveLastTreeId(tree.id);

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
  }, [treeId, skillTree?.id, navigate, setError, setSkillTree]);

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
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-app-muted">{loadError || '尚未生成技能树'}</p>
          <Link to="/generate" className="text-skill-core font-bold hover:underline">去生成 →</Link>
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
        {/* 画布（放在底层） */}
        <div className="absolute inset-0 z-0">
          <SkillTreeCanvas
            data={skillTree}
            onNodeClick={(id) => setActiveNode(id)}
          />
        </div>

        {/* 顶部悬浮信息栏 - 改为半透明紧凑设计 */}
        <div className="pointer-events-none absolute left-6 top-6 z-10 max-w-md">
          <div className="pointer-events-auto">
            {isMapCollapsed ? (
              <button
                type="button"
                onClick={() => setIsMapCollapsed(false)}
                className="panel-card-soft flex items-center gap-3 rounded-2xl px-4 py-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-app-surface/70 text-skill-core">
                  <ChevronRight size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-app-muted">成长地图</div>
                  <div className="mt-1 truncate text-sm font-black text-app-text">{skillTree.career}</div>
                </div>
                <div className="ml-auto text-sm font-black text-skill-core">{overallProgress}%</div>
              </button>
            ) : (
              <div className="panel-card-soft flex flex-col gap-4 rounded-2xl px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="section-kicker mb-2">
                      <Sparkles size={12} />
                      成长地图
                    </div>
                    <h1 className="truncate text-xl font-black text-app-text">{skillTree.career}</h1>
                    <p className="mt-2 text-sm leading-6 text-app-muted">{skillTree.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapCollapsed(true)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-app-border bg-app-surface/70 text-app-muted transition-colors hover:text-skill-core"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>

                {skillTree.overallObjective && (
                  <div className="rounded-2xl border border-app-border bg-app-surface/70 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-app-muted">总体目标</div>
                    <p className="mt-2 text-sm leading-6 text-app-text">{skillTree.overallObjective}</p>
                  </div>
                )}
                {skillTree.overallKeyResults && skillTree.overallKeyResults.length > 0 && (
                  <div className="space-y-2">
                    {skillTree.overallKeyResults.slice(0, 3).map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-xl border border-app-border bg-app-surface/70 px-3 py-2 text-xs leading-5 text-app-text">
                        KR {index + 1}: {item}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-app-muted mb-1">
                      <Radar size={12} />
                      进度
                    </div>
                    <div className="text-lg font-black text-skill-core">{overallProgress}%</div>
                  </div>
                  <div className="w-[1px] h-8 bg-app-border"></div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-app-muted mb-1">
                      <GitBranch size={12} />
                      已解锁
                    </div>
                    <div className="text-lg font-black text-status-completed">{unlockedCount}/{nodes.length}</div>
                  </div>
                  <div className="w-[1px] h-8 bg-app-border"></div>
                  <div className="flex flex-col">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-app-muted mb-1">
                      预计周期
                    </div>
                    <div className="text-lg font-black text-app-text">{skillTree.estimatedMonths || '-'} 月</div>
                  </div>
                </div>

                <div className="pointer-events-auto">
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
                      className="btn-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Download size={16} />
                      {isExportingHtml ? '正在导出 HTML...' : '导出 HTML 报告'}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPackage}
                      disabled={isExportingPackage}
                      className="btn-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FileUp size={16} />
                      {isExportingPackage ? '正在导出数据包...' : '导出数据包'}
                    </button>
                    <button
                      type="button"
                      onClick={handleImportClick}
                      disabled={isImporting}
                      className="btn-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FolderUp size={16} />
                      {isImporting ? '正在导入...' : '导入数据包'}
                    </button>
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
          <div className="absolute inset-y-0 right-0 z-20 w-full sm:w-[400px]">
            <SkillNodeDetail 
              node={activeNode} 
              onClose={() => setActiveNode(null)} 
            />
          </div>
        )}

        {/* 底部悬浮提示 */}
        <div className="pointer-events-none absolute bottom-6 left-6 z-10 rounded-2xl border border-app-border bg-app-surface/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-app-muted">
            <span>💡</span> 点击节点查看详情并记录复盘
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default TreePage;
