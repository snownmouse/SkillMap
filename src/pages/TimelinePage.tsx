import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Radar, Sparkles } from 'lucide-react';
import { useSkillTree } from '../hooks/useSkillTree';
import AppLayout from '../components/Layout/AppLayout';
import TimelineView from '../components/Timeline/TimelineView';
import { difyApi } from '../services/difyApi';
import { storage } from '../services/storage';

/**
 * 时间线页面
 */
const TimelinePage: React.FC = () => {
  const navigate = useNavigate();
  const { treeId } = useParams<{ treeId?: string }>();
  const { skillTree, setSkillTree, setError } = useSkillTree();
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
          navigate(`/tree/${tree.id}/timeline`, { replace: true });
        }
      } catch (e) {
        if (cancelled) return;

        const message = e instanceof Error ? e.message : '加载时间线失败';
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
          <p className="text-app-text font-bold">正在恢复成长时间线...</p>
          <p className="text-sm text-app-muted">会优先加载最近一次使用的技能树。</p>
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

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6">
        <div>
          <div className="section-kicker mb-4">
            <Radar size={14} />
            Growth Timeline
          </div>
          <div className="panel-card rounded-[24px] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-black text-app-text md:text-3xl">成长历程</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted">
                  这里记录你在 {skillTree.career} 路线上的关键节点，包括生成、对话、解锁与认知变化。
                </p>
                {skillTree.overallObjective && (
                  <div className="mt-3 rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-sm leading-6 text-app-text">
                    当前主线目标：{skillTree.overallObjective}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-app-border bg-app-surface px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-app-muted">
                  <Sparkles size={14} />
                  Timeline Events
                </div>
                <div className="text-xl font-black text-skill-core">{skillTree.timeline.length}</div>
                <div className="mt-1 text-xs text-app-muted">预计周期 {skillTree.estimatedMonths || '-'} 个月</div>
              </div>
            </div>
          </div>
        </div>

        <TimelineView events={skillTree.timeline} />
      </div>
    </AppLayout>
  );
};

export default TimelinePage;
