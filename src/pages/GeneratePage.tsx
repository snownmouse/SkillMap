import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GenerateForm from '../components/Generate/GenerateForm';
import { useSkillTree } from '../hooks/useSkillTree';
import { difyApi, TaskStatus } from '../services/difyApi';
import { storage } from '../services/storage';
import { UserInput } from '../types/skillTree';
import { useTaskWebSocket } from '../hooks/useTaskWebSocket';

/**
 * 生成页
 */
const GeneratePage: React.FC = () => {
  const POLL_INTERVAL_MS = 10000;
  const MAX_POLL_DURATION_MS = 300000;
  const MAX_NETWORK_FAILURES = 3;
  const navigate = useNavigate();
  const { setSkillTree, setGenerating, isGenerating, error, setError } = useSkillTree();
  const [career, setCareer] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('正在准备...');
  const [preview, setPreview] = useState('');

  useTaskWebSocket(taskId, async (update) => {
    if (update.progress !== undefined) setProgress(update.progress);
    if (update.phase) setPhase(update.phase);
    if (update.preview) setPreview(update.preview);

    if (update.status === 'skeleton_ready' && update.treeId) {
      setGenerating(false);
      navigate(`/tree/${update.treeId}`, { replace: true });
      return;
    }

    if (update.status === 'completed' && update.treeId) {
      try {
        const tree = await difyApi.getSkillTreeById(update.treeId);
        setSkillTree(tree);
      } catch {
      } finally {
        storage.clearPendingTask();
        setGenerating(false);
        navigate(`/tree/${update.treeId}`, { replace: true });
      }
      return;
    }

    if (update.status === 'failed') {
      storage.clearPendingTask();
      setError(update.error || '生成失败，请稍后重试');
      setGenerating(false);
      return;
    }
  });

  const pollTaskStatus = useCallback(async (id: string, startedAt = Date.now(), networkFailures = 0) => {
    try {
      const status: TaskStatus = await difyApi.getTaskStatus(id);
      
      switch (status.status) {
        case 'completed':
          if (status.result) {
            setSkillTree(status.result.data);
            storage.saveLastTreeId(status.result.id || status.result.data.id);
            storage.clearPendingTask();
            setGenerating(false);
            navigate(status.result.id ? `/tree/${status.result.id}` : `/tree/${status.result.data.id}`, { replace: true });
          }
          break;
        case 'skeleton_ready':
          if (status.treeId) {
            setGenerating(false);
            navigate(`/tree/${status.treeId}`, { replace: true });
          }
          break;
        case 'failed':
          storage.clearPendingTask();
          setError(status.error || '生成失败，请稍后重试');
          setGenerating(false);
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
          if (status.progress !== undefined) setProgress(status.progress);
          if (status.phase) setPhase(status.phase);
          if (status.preview) setPreview(status.preview);
          setTimeout(() => pollTaskStatus(id, startedAt, 0), POLL_INTERVAL_MS);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error('获取任务状态失败:', e);
      if (networkFailures + 1 < MAX_NETWORK_FAILURES) {
        setTimeout(() => pollTaskStatus(id, startedAt, networkFailures + 1), POLL_INTERVAL_MS);
        return;
      }
      setError('无法连接到服务端，获取任务状态失败。请确认服务仍在运行后重试。');
      setGenerating(false);
    }
  }, [navigate, setError, setGenerating, setPhase, setPreview, setProgress, setSkillTree]);

  useEffect(() => {
    const pendingTask = storage.loadPendingTask();
    if (!pendingTask) return;

    setTaskId(pendingTask.taskId);
    setCareer(pendingTask.career || '');
    setGenerating(true);
    setError(null);
    setProgress(5);
    setPhase('正在准备...');
    pollTaskStatus(pendingTask.taskId, new Date(pendingTask.createdAt).getTime());
  }, [pollTaskStatus, setGenerating]);

  const handleGenerate = async (input: UserInput) => {
    setGenerating(true);
    setError(null);
    setCareer(input.career);
    setProgress(5);
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
      });
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
      await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...difyApi.getAuthHeaders() } });
    } catch {
    } finally {
      storage.clearPendingTask();
      setGenerating(false);
      setError('已取消生成');
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
            <h1 className="text-3xl font-black text-app-text md:text-4xl">定制你的专属 SkillMap</h1>
          </div>
          {error && (
            <div className="mx-auto mb-6 w-full max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
              {taskId && <span className="ml-2 text-red-300/80">任务 ID: {taskId}</span>}
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
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-app-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-skill-core transition-all duration-500 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
          </div>

          {preview && (
            <div className="p-4 bg-app-surface/50 rounded-xl font-mono text-xs text-app-muted/70 h-24 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-app-surface/50 via-transparent to-transparent pointer-events-none" />
              <p className="break-all leading-relaxed">{preview}</p>
            </div>
          )}

          <p className="text-center text-sm text-app-muted">
            AI 正在为你规划「<span className="text-skill-core font-bold">{career}</span>」的技能图谱
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
