import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GenerateForm from '../components/Generate/GenerateForm';
import { useSkillTree } from '../hooks/useSkillTree';
import { difyApi, TaskStatus } from '../services/difyApi';
import { storage } from '../services/storage';
import { UserInput } from '../types/skillTree';
import { useTaskWebSocket } from '../hooks/useTaskWebSocket';
import { useAppContext } from '../context/AppContext';

/**
 * 生成页
 */
const GeneratePage: React.FC = () => {
  const POLL_INTERVAL_MS = 15000; // 增加轮询间隔，给服务端更多处理时间
  const MAX_POLL_DURATION_MS = 1200000; // 20分钟
  const MAX_NETWORK_FAILURES = 5; // 增加重试次数，提高容错能力
  const navigate = useNavigate();
  const { setSkillTree, setGenerating, isGenerating, error, setError } = useSkillTree();
  const { state: appState } = useAppContext();
  const currentUserId = appState.auth?.user?.id;
  
  const [career, setCareer] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [targetProgress, setTargetProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [phase, setPhase] = useState('正在准备...');
  const [stage, setStage] = useState<number>(1); // 1: 准备, 2: 生成骨架, 3: 填充节点, 4: 完善保存, 5: 完成
  const [preview, setPreview] = useState('');
  const [canRetry, setCanRetry] = useState(false);
  const [attempts, setAttempts] = useState<number | null>(null);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  const [nextRetryAt, setNextRetryAt] = useState<string | null>(null);
  const [nodeCount, setNodeCount] = useState<number>(0);
  const [recentNodes, setRecentNodes] = useState<Array<{ id: string; name: string; category: string }>>([]);

  // 统一的进度条速度配置
  const BASE_SPEED_PER_SEC = 0.35; // 统一速度，避免阶段切换时的突兀变化
  const MAX_CATCH_UP_SPEED = 0.8;  // 最大追赶速度（稍微提高以应对大跳跃）
  const CATCH_UP_THRESHOLD = 0.5;  // 超过这个差距才开始追赶

  // 平滑进度条动画
  useEffect(() => {
    let animationId: number;
    let lastFrameTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastFrameTime;
      lastFrameTime = now;
      const deltaSeconds = deltaTime / 1000;

      setDisplayProgress(prev => {
        const diff = targetProgress - prev;

        // 如果目标进度还未设置，保持当前进度
        if (targetProgress === undefined || targetProgress === null) {
          return prev;
        }

        // 追赶模式：当差距超过阈值时进行追赶
        if (diff > CATCH_UP_THRESHOLD) {
          // 使用线性插值，让追赶速度与差距成正比，但有上限
          const catchUpSpeed = Math.min(MAX_CATCH_UP_SPEED, diff * 0.2);
          const catchUpStep = catchUpSpeed * deltaSeconds;
          
          // 使用平滑缓动：越接近目标越慢
          const easingFactor = 1 - Math.pow(diff / 50, 2);
          const easedStep = catchUpStep * (0.6 + 0.4 * Math.max(0, easingFactor));
          
          return Math.min(99.5, prev + easedStep);
        } else if (diff < -CATCH_UP_THRESHOLD) {
          // 后退情况（不应该发生，但处理一下）
          const catchUpStep = Math.min(MAX_CATCH_UP_SPEED, Math.abs(diff) * 0.2) * deltaSeconds;
          return Math.max(0, prev - catchUpStep);
        } else {
          // 正常前进模式：保持匀速前进，给用户持续工作的感觉
          const baseIncrement = BASE_SPEED_PER_SEC * deltaSeconds;
          // 如果已经非常接近目标，稍微放慢速度
          const slowDownFactor = diff > 0 && diff < 2 ? diff / 2 : 1;
          return Math.min(99.5, Math.max(0, prev + baseIncrement * slowDownFactor));
        }
      });

      // 持续动画，不会停止
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [targetProgress]);

  const pollTaskStatus = useCallback(async (id: string, startedAt = Date.now()) => {
    try {
      const status: TaskStatus = await difyApi.getTaskStatus(id);
      
      switch (status.status) {
        case 'completed':
          if (status.result) {
            setSkillTree(status.result.data);
            storage.saveLastTreeId(status.result.id || status.result.data.id, currentUserId);
            storage.clearPendingTask(currentUserId);
            setGenerating(false);
            navigate(status.result.id ? `/tree/${status.result.id}` : `/tree/${status.result.data.id}`, { replace: true });
          }
          break;
        case 'failed':
          storage.clearPendingTask(currentUserId);
          setError(status.error || '生成失败，请稍后重试');
          setGenerating(false);
          setCanRetry(true);
          setAttempts(status.attempts ?? null);
          setMaxAttempts(status.maxAttempts ?? null);
          setNextRetryAt(status.nextRetryAt ?? null);
          break;
        case 'pending':
        case 'in_progress':
        case 'streaming':
        case 'node_filled':
          if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
            setError('生成时间过长，已停止自动等待。你可以稍后重新进入生成页继续检查结果。');
            setGenerating(false);
            return;
          }
          if (status.progress !== undefined) setTargetProgress(status.progress);
          if (status.phase) setPhase(status.phase);
          if (status.stage !== undefined) setStage(status.stage);
          if (status.preview) setPreview(status.preview);
          if (status.nodeCount !== undefined) setNodeCount(status.nodeCount);
          setAttempts(status.attempts ?? null);
          setMaxAttempts(status.maxAttempts ?? null);
          setNextRetryAt(status.nextRetryAt ?? null);
          setPhase(status.phase || '正在生成技能树...');
          setTimeout(() => pollTaskStatus(id, startedAt), POLL_INTERVAL_MS);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error('获取任务状态失败（继续等待）:', e);
      // 服务端可能在处理耗时任务（如 DeepSeek API），不要停止轮询
      // 继续等待，直到超过最大等待时间
      if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
        setError('生成时间过长，已停止自动等待。你可以稍后重新进入生成页继续检查结果。');
        setGenerating(false);
        return;
      }
      // 显示正在等待的状态，但不停止轮询
      setPhase('正在等待服务端响应...（任务仍在后台运行）');
      setTimeout(() => pollTaskStatus(id, startedAt), POLL_INTERVAL_MS);
    }
  }, [navigate, setError, setGenerating, setPhase, setPreview, setTargetProgress, setSkillTree, currentUserId]);

  useTaskWebSocket(taskId, async (update) => {
    if (update.progress !== undefined) setTargetProgress(update.progress);
    if (update.phase) setPhase(update.phase);
    if (update.stage !== undefined) setStage(update.stage);
    if (update.preview) setPreview(update.preview);
    if (update.attempts !== undefined) setAttempts(update.attempts);
    if (update.maxAttempts !== undefined) setMaxAttempts(update.maxAttempts);
    if (update.nextRetryAt) setNextRetryAt(update.nextRetryAt);
    if (update.nodeCount !== undefined) setNodeCount(update.nodeCount);

    if (update.nodeId && update.nodeData) {
      setRecentNodes(prev => {
        const next = [{ id: update.nodeId!, name: update.nodeData?.name || update.nodeId!, category: update.nodeData?.category || 'general' }, ...prev];
        return next.slice(0, 8);
      });
    }

    if (update.status === 'completed' && update.treeId) {
      try {
        const tree = await difyApi.getSkillTreeById(update.treeId);
        setSkillTree(tree);
      } catch {
      } finally {
        storage.clearPendingTask(currentUserId);
        setGenerating(false);
        navigate(`/tree/${update.treeId}`, { replace: true });
      }
      return;
    }

    if (update.status === 'failed') {
      storage.clearPendingTask(currentUserId);
      setError(update.error || '生成失败，请稍后重试');
      setGenerating(false);
      setCanRetry(true);
      return;
    }
  });

  useEffect(() => {
    const pendingTask = storage.loadPendingTask(currentUserId);
    if (!pendingTask) return;

    setTaskId(pendingTask.taskId);
    setCareer(pendingTask.career || '');
    setGenerating(true);
    setError(null);
    setCanRetry(false);
    setAttempts(null);
    setMaxAttempts(null);
    setNextRetryAt(null);
    // 不设置固定初始进度，等待第一次轮询返回真实进度
    // 这样可以避免从 5% 跳到真实进度的突兀感
    setPhase('正在恢复任务状态...');
    pollTaskStatus(pendingTask.taskId, new Date(pendingTask.createdAt).getTime());
  }, [pollTaskStatus, setGenerating, currentUserId]);

  const handleGenerate = async (input: UserInput) => {
    setGenerating(true);
    setError(null);
    setCanRetry(false);
    setAttempts(null);
    setMaxAttempts(null);
    setNextRetryAt(null);
    setCareer(input.career);
    setTargetProgress(5);
    setPhase('正在准备...');
    setPreview('');
    try {
      const response = await difyApi.generateSkillTree(input);
      const id = response.taskId;
      setTaskId(id);
      storage.savePendingTask({
        taskId: id,
        career: input.career,
        createdAt: new Date().toISOString(),
      }, currentUserId);
      // 开始轮询任务状态
      pollTaskStatus(id, Date.now());
    } catch (e) {
      console.error(e);
      setError('生成失败，请稍后重试');
      setGenerating(false);
    }
  };

  const handleCancel = async () => {
    if (!taskId) return;
    try {
      await difyApi.cancelTask(taskId);
    } catch {
    } finally {
      storage.clearPendingTask(currentUserId);
      setGenerating(false);
      setError('已取消生成');
      setCanRetry(false);
    }
  };

  const handleRetry = async () => {
    if (!taskId) return;
    try {
      setError(null);
      setCanRetry(false);
      setGenerating(true);
      setTargetProgress(5);
      setDisplayProgress(5);
      setPhase('正在准备...');
      setPreview('');
      await difyApi.retryTask(taskId);
      storage.savePendingTask({ taskId, career, createdAt: new Date().toISOString() }, currentUserId);
      pollTaskStatus(taskId, Date.now());
    } catch {
      setGenerating(false);
      setError('重试失败，请稍后再试');
      setCanRetry(true);
    }
  };

  return (
    <div className="app-shell px-4 py-6 md:px-6">
      {!isGenerating ? (
        <div className="app-container">
          <div className="page-hero text-center mb-8">
            <div className="section-kicker mx-auto mb-4 w-fit">
              生成你的成长地图
            </div>
            <h1 className="text-3xl font-black text-app-text md:text-4xl">定制你的专属技能树</h1>
          </div>
          {error && (
            <div className="mx-auto mb-6 w-full max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
              {taskId && <span className="ml-2 text-red-300/80">任务 ID: {taskId}</span>}
              {(attempts !== null || maxAttempts !== null || nextRetryAt) && (
                <div className="mt-2 text-xs text-red-200/80">
                  {attempts !== null && <span>已尝试 {attempts}</span>}
                  {maxAttempts !== null && <span>{attempts !== null ? ` / ${maxAttempts}` : `最大重试 ${maxAttempts}`}</span>}
                  {nextRetryAt && <span className="ml-2">下次自动重试：{new Date(nextRetryAt).toLocaleString()}</span>}
                </div>
              )}
              {canRetry && taskId && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleRetry}
                    className="rounded-xl bg-red-500/20 px-3 py-1 text-xs text-red-100 hover:bg-red-500/30"
                  >
                    重试任务
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="mx-auto w-full max-w-2xl">
            <GenerateForm onSubmit={handleGenerate} isLoading={isGenerating} />
          </div>
        </div>
      ) : (
        <div className="py-12 sm:py-16 space-y-6 max-w-2xl mx-auto">
          <div>
            <div className="flex justify-between text-sm text-app-muted mb-2">
              <span>{phase || '正在准备...'}</span>
              <span>{displayProgress.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-app-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-skill-core transition-all ease-out"
                style={{ width: `${Math.max(0, Math.min(100, displayProgress))}%` }}
              />
            </div>
          </div>

          {nodeCount > 0 && (
            <div className="p-4 bg-app-surface/50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-app-text">实时节点生成</span>
                <span className="text-2xl font-black text-skill-core">{nodeCount}</span>
              </div>
              {recentNodes.length > 0 && (
                <div className="space-y-1.5">
                  {recentNodes.map((node, idx) => (
                    <div
                      key={node.id}
                      className="flex items-center gap-2 text-xs animate-fade-in"
                      style={{ opacity: 1 - idx * 0.1 }}
                    >
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                        node.category === 'core' ? 'bg-blue-400' :
                        node.category === 'specialization' ? 'bg-orange-400' :
                        'bg-purple-400'
                      }`} />
                      <span className="text-app-muted truncate">{node.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {preview && !nodeCount && (
          <div className="p-4 bg-app-surface/50 rounded-xl text-sm text-app-muted/80">
            <p className="break-all leading-relaxed">
              {(() => {
                let cleanText = preview;
                cleanText = cleanText.replace(/[{}\[\]"]/g, '');
                cleanText = cleanText.replace(/\\n/g, ' ');
                cleanText = cleanText.replace(/\s+/g, ' ');
                if (cleanText.length > 200) {
                  cleanText = cleanText.substring(0, 200) + '...';
                }
                return cleanText;
              })()}
            </p>
          </div>
        )}

          <p className="text-center text-sm text-app-muted">
            AI 正在为你规划「<span className="text-skill-core font-bold">{career}</span>」的技能图谱
            {nodeCount > 0 && <span className="ml-1">· 已生成 <span className="text-skill-core font-bold">{nodeCount}</span> 个节点</span>}
          </p>

          <button onClick={handleCancel} className="block mx-auto text-sm text-app-muted hover:text-app-text">
            取消生成
          </button>
        </div>
      )}
    </div>
  );
};

export default GeneratePage;
