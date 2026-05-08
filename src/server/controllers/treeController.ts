import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { llmService } from '../llmService';
import { getGenerateTreePrompt } from '../prompts/generateTree';
import { getGenerateTreeSkeletonPrompt } from '../prompts/generateTreeSkeleton';
import { getNodeDetailsPrompt } from '../prompts/generateNodeDetails';
import { GenerateTreeRequest, SkillTreeData } from '../../types/backend';
import { validateSkillTreeData } from '../../utils/jsonValidator';
import { notifyTaskUpdate } from '../websocket';
import { getCachedSkeleton, getCachedTree, setCachedSkeleton, setCachedTree } from '../services/TreeTemplateCacheService';
import { getAllowedUserIds } from '../utils/auth';
import { cleanupStaleTasks } from '../middleware/security';
import type { PlanMeta } from '../../types/skillTree';
import { logger } from '../utils/logger';
import { enqueueTask, getTaskQueueMode } from '../services/TaskQueueService';

const TASK_TIMEOUT_MS = parseInt(process.env.TREE_GENERATION_TIMEOUT_MS || '300000');
const TREE_GENERATION_MODE = (process.env.TREE_GENERATION_MODE || 'full').toLowerCase();
const TASK_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

setInterval(() => {
  cleanupStaleTasks(tasks);
}, TASK_CLEANUP_INTERVAL_MS);

function buildExportFileName(career: string, suffix: string) {
  const safeCareer = (career || 'skill-tree')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 50);

  return `${safeCareer || 'skill-tree'}-${suffix}.json`;
}

function buildPlanMeta(inputs: GenerateTreeRequest): PlanMeta | undefined {
  const raw = inputs.planMeta && typeof inputs.planMeta === 'object' ? inputs.planMeta as any : undefined;
  const longTermGoal = typeof inputs.longTermGoal === 'string' && inputs.longTermGoal.trim()
    ? inputs.longTermGoal.trim()
    : typeof raw?.longTermGoal === 'string' && raw.longTermGoal.trim()
      ? raw.longTermGoal.trim()
      : undefined;

  const stages = Array.isArray(raw?.stages) ? raw.stages : undefined;
  const paths = Array.isArray(raw?.paths) ? raw.paths : undefined;
  const selectedStageId = typeof raw?.selectedStageId === 'string' ? raw.selectedStageId : undefined;
  const selectedPathId = typeof raw?.selectedPathId === 'string' ? raw.selectedPathId : undefined;

  if (!longTermGoal && !selectedStageId && !selectedPathId && (!stages || stages.length === 0) && (!paths || paths.length === 0)) {
    return undefined;
  }

  return {
    ...(longTermGoal ? { longTermGoal } : {}),
    ...(stages && stages.length > 0 ? { stages } : {}),
    ...(paths && paths.length > 0 ? { paths } : {}),
    ...(selectedStageId ? { selectedStageId } : {}),
    ...(selectedPathId ? { selectedPathId: selectedPathId as any } : {}),
  };
}

// 任务状态类型
type TaskStatus = 'pending' | 'in_progress' | 'streaming' | 'skeleton_ready' | 'node_filled' | 'completed' | 'failed';

// 任务接口
interface Task {
  id: string;
  status: TaskStatus;
  inputs: GenerateTreeRequest;
  userId: string;
  result?: { id: string; data: SkillTreeData };
  error?: string;
  progress?: number;
  phase?: string;
  preview?: string;
  treeId?: string;
  cancelled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 任务存储
const tasks: Map<string, Task> = new Map();

type DbTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

function mapToDbStatus(status: TaskStatus): DbTaskStatus {
  if (status === 'pending') return 'pending';
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  return 'in_progress';
}

async function upsertTaskRow(pool: any, task: Task) {
  const nowStr = task.updatedAt.toISOString();
  const progress = typeof task.progress === 'number' ? task.progress : 0;
  const stage = task.phase || '';
  const message = '';
  const treeId = task.treeId || null;
  const error = task.error || null;
  const status = mapToDbStatus(task.status);
  const inputs = task.inputs ? JSON.stringify(task.inputs) : null;
  const maxAttempts = Math.max(1, parseInt(process.env.TASK_MAX_ATTEMPTS || '3'));
  const isTerminal = status === 'completed' || status === 'failed';
  const leaseOwner = isTerminal ? null : undefined;
  const leaseExpiresAt = isTerminal ? null : undefined;
  const nextRetryAt = isTerminal ? null : undefined;
  const lastFinishedAt = isTerminal ? nowStr : undefined;

  await pool.query(
    `INSERT INTO tasks (id, user_id, status, progress, stage, message, tree_id, error, updated_at, inputs, max_attempts, lease_owner, lease_expires_at, next_retry_at, last_finished_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT (id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       status = EXCLUDED.status,
       progress = EXCLUDED.progress,
       stage = EXCLUDED.stage,
       message = EXCLUDED.message,
       tree_id = EXCLUDED.tree_id,
       error = EXCLUDED.error,
       updated_at = EXCLUDED.updated_at,
       inputs = COALESCE(EXCLUDED.inputs, tasks.inputs),
       max_attempts = COALESCE(tasks.max_attempts, EXCLUDED.max_attempts),
       lease_owner = COALESCE(EXCLUDED.lease_owner, tasks.lease_owner),
       lease_expires_at = COALESCE(EXCLUDED.lease_expires_at, tasks.lease_expires_at),
       next_retry_at = COALESCE(EXCLUDED.next_retry_at, tasks.next_retry_at),
       last_finished_at = COALESCE(EXCLUDED.last_finished_at, tasks.last_finished_at)`,
    [task.id, task.userId, status, progress, stage, message, treeId, error, nowStr, inputs, maxAttempts, leaseOwner, leaseExpiresAt, nextRetryAt, lastFinishedAt]
  );
}

// 处理任务的函数
async function processTask(taskId: string) {
  const task = tasks.get(taskId);
  if (!task) return;

  try {
    task.status = 'in_progress';
    task.progress = 5;
    task.phase = '准备生成';
    task.updatedAt = new Date();
    tasks.set(taskId, task);
    notifyTaskUpdate(taskId, { status: 'in_progress', userId: task.userId, phase: task.phase, progress: task.progress });

    const pool = getDb();
    await upsertTaskRow(pool, task);

    let previewBuffer = '';
    const pushPreview = (delta: string) => {
      previewBuffer = (previewBuffer + delta).slice(-200);
      task.preview = previewBuffer;
      task.updatedAt = new Date();
      tasks.set(taskId, task);
      notifyTaskUpdate(taskId, { status: 'streaming', userId: task.userId, preview: previewBuffer });
    };

    const checkCancelled = () => {
      const current = tasks.get(taskId);
      if (current?.cancelled) {
        throw new Error('用户取消');
      }
    };

    const withTimeout = async <T,>(promise: Promise<T>): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`生成超时，超过 ${TASK_TIMEOUT_MS}ms`)), TASK_TIMEOUT_MS);
        })
      ]);
    };

    checkCancelled();
    if (TREE_GENERATION_MODE === 'full') {
      const cached = await getCachedTree(task.inputs);
      if (cached) {
        const treeData = validateSkillTreeData(JSON.parse(JSON.stringify(cached)));
        const planMeta = buildPlanMeta(task.inputs);
        if (planMeta) treeData.planMeta = planMeta;
        const treeId = uuidv4();
        treeData.id = treeId;
        treeData.version = treeData.version || '1.0';
        treeData.generatedAt = new Date().toISOString();

        await pool.query(
          `INSERT INTO trees (id, user_id, career, tree_data, partial)
           VALUES ($1, $2, $3, $4, $5)`,
          [treeId, task.userId, task.inputs.career, JSON.stringify(treeData), 0]
        );

        task.status = 'completed';
        task.treeId = treeId;
        task.result = { id: treeId, data: treeData };
        task.progress = 100;
        task.phase = '生成完成';
        task.updatedAt = new Date();
        tasks.set(taskId, task);
        notifyTaskUpdate(taskId, { status: 'completed', userId: task.userId, treeId, progress: 100, phase: task.phase });
        await upsertTaskRow(pool, task);
        return;
      }

      const { system, user } = getGenerateTreePrompt(task.inputs);
      const rawTreeData: SkillTreeData = await withTimeout(
        llmService.chatJSONStream(
          system,
          user,
          {
            onChunk: pushPreview,
            onPhase: (phase, progress) => {
              const mapped = 5 + Math.min(90, Math.round(progress * 0.9));
              task.phase = phase;
              task.progress = mapped;
              task.updatedAt = new Date();
              tasks.set(taskId, task);
              notifyTaskUpdate(taskId, { status: 'in_progress', userId: task.userId, phase, progress: mapped });
            }
          }
        )
      );

      checkCancelled();
      const treeData = validateSkillTreeData(rawTreeData);
      const planMeta = buildPlanMeta(task.inputs);
      if (planMeta) treeData.planMeta = planMeta;
      const treeId = uuidv4();
      treeData.id = treeId;
      treeData.version = treeData.version || '1.0';
      treeData.generatedAt = new Date().toISOString();

      await pool.query(
        `INSERT INTO trees (id, user_id, career, tree_data, partial)
         VALUES ($1, $2, $3, $4, $5)`,
        [treeId, task.userId, task.inputs.career, JSON.stringify(treeData), 0]
      );
      setCachedTree(task.inputs, treeData).catch(() => {});

      task.status = 'completed';
      task.treeId = treeId;
      task.result = { id: treeId, data: treeData };
      task.progress = 100;
      task.phase = '生成完成';
      task.updatedAt = new Date();
      tasks.set(taskId, task);
      notifyTaskUpdate(taskId, { status: 'completed', userId: task.userId, treeId, progress: 100, phase: task.phase });
      await upsertTaskRow(pool, task);
      return;
    }

    const cachedSkeleton = await getCachedSkeleton(task.inputs);
    const skeletonRaw = cachedSkeleton
      ? JSON.parse(JSON.stringify(cachedSkeleton))
      : await (async () => {
          const { system: skSystem, user: skUser } = getGenerateTreeSkeletonPrompt(task.inputs);
          return withTimeout(
            llmService.chatJSONStream(
              skSystem,
              skUser,
              {
                onChunk: pushPreview,
                onPhase: (phase, progress) => {
                  const mapped = 5 + Math.min(30, Math.round(progress * 0.35));
                  task.phase = phase;
                  task.progress = mapped;
                  task.updatedAt = new Date();
                  tasks.set(taskId, task);
                  notifyTaskUpdate(taskId, { status: 'in_progress', userId: task.userId, phase, progress: mapped });
                }
              }
            )
          );
        })();

    checkCancelled();
    const skeleton = validateSkillTreeData(skeletonRaw) as SkillTreeData;
    const planMeta = buildPlanMeta(task.inputs);
    if (planMeta) skeleton.planMeta = planMeta;
    const treeId = uuidv4();
    skeleton.id = treeId;
    skeleton.version = skeleton.version || '1.0';
    skeleton.generatedAt = new Date().toISOString();

    await pool.query(
      `INSERT INTO trees (id, user_id, career, tree_data, partial)
       VALUES ($1, $2, $3, $4, $5)`,
      [treeId, task.userId, task.inputs.career, JSON.stringify(skeleton), 1]
    );
    if (!cachedSkeleton) setCachedSkeleton(task.inputs, skeleton).catch(() => {});

    task.status = 'skeleton_ready';
    task.treeId = treeId;
    task.progress = 40;
    task.phase = '树结构就绪，正在填充详情';
    task.result = { id: treeId, data: skeleton };
    task.updatedAt = new Date();
    tasks.set(taskId, task);
    notifyTaskUpdate(taskId, { status: 'skeleton_ready', userId: task.userId, treeId, phase: task.phase, progress: task.progress });

    const nodeIds = Object.keys(skeleton.nodes).filter(id => id !== 'meta_growth');
    const batchSize = 4;
    const batches: string[][] = [];
    for (let i = 0; i < nodeIds.length; i += batchSize) {
      batches.push(nodeIds.slice(i, i + batchSize));
    }

    let completedNodes = 0;
    let hadFailures = false;

    await Promise.allSettled(batches.map(async (batch) => {
      try {
        checkCancelled();
        const nodesMeta = batch.map(id => ({
          id,
          name: skeleton.nodes[id]?.name || id,
          category: skeleton.nodes[id]?.category || 'general',
          difficulty: skeleton.nodes[id]?.difficulty || 'beginner',
        }));

        const { system, user } = getNodeDetailsPrompt(task.inputs, nodesMeta);
        const detailsRaw = await withTimeout(llmService.chatJSON(system, user));

        const details = Array.isArray(detailsRaw) ? detailsRaw : [];
        for (const detail of details) {
          checkCancelled();
          const id = detail?.id;
          if (!id || !skeleton.nodes[id]) continue;
          skeleton.nodes[id] = { ...skeleton.nodes[id], ...detail, id };
          completedNodes++;

          const progress = 40 + Math.round((completedNodes / Math.max(1, nodeIds.length)) * 55);
          task.progress = progress;
          task.updatedAt = new Date();
          tasks.set(taskId, task);
          notifyTaskUpdate(taskId, { status: 'node_filled', userId: task.userId, treeId, nodeId: id, nodeData: skeleton.nodes[id], progress });
        }

        await pool.query(
          `UPDATE trees SET tree_data = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(skeleton), treeId]
        );
      } catch (e) {
        hadFailures = true;
        task.updatedAt = new Date();
        tasks.set(taskId, task);
        notifyTaskUpdate(taskId, {
          status: 'in_progress',
          userId: task.userId,
          treeId,
          progress: task.progress,
          phase: task.phase,
          message: e instanceof Error ? e.message : '节点详情生成失败'
        });
      }
    }));

    await pool.query(
      `UPDATE trees SET tree_data = $1, partial = $2, updated_at = NOW() WHERE id = $3`,
      [JSON.stringify(skeleton), hadFailures ? 1 : 0, treeId]
    );

    task.status = 'completed';
    task.result = { id: treeId, data: skeleton };
    task.progress = 100;
    task.error = hadFailures ? '部分节点详情生成失败' : undefined;
    task.updatedAt = new Date();
    tasks.set(taskId, task);
    notifyTaskUpdate(taskId, {
      status: 'completed',
      userId: task.userId,
      treeId,
      progress: 100,
      phase: hadFailures ? '生成完成（部分节点待补全）' : '生成完成',
      message: hadFailures ? '部分节点详情生成失败，可先浏览结构与已填充内容' : undefined
    });
    await upsertTaskRow(pool, task);
  } catch (error) {
    logger.error('生成技能树失败', error);
    // 更新任务状态为失败
    task.status = 'failed';
    task.error = error instanceof Error ? error.message : '生成失败';
    task.updatedAt = new Date();
    tasks.set(taskId, task);
    notifyTaskUpdate(taskId, { status: 'failed', userId: task.userId, treeId: task.treeId, error: task.error, progress: task.progress, phase: task.phase });
    try {
      const pool = getDb();
      await upsertTaskRow(pool, task);
    } catch (e) {
      logger.warn('任务落库失败', { taskId, error: (e as Error).message });
    }
  }
}

export async function runQueuedTask(taskId: string) {
  const pool = getDb();
  const res = await pool.query(
    'SELECT id, user_id, status, inputs, attempts, max_attempts, next_retry_at, lease_owner, lease_expires_at FROM tasks WHERE id = $1',
    [taskId]
  );
  if ((res.rows || []).length === 0) return;
  const row: any = res.rows[0];
  const status = String(row.status || '');
  if (status === 'completed' || status === 'failed') return;

  const now = new Date();
  const nowStr = now.toISOString();
  const leaseMs = Math.max(10000, parseInt(process.env.TASK_LEASE_MS || '600000'));
  const leaseExpiresAt = new Date(now.getTime() + leaseMs).toISOString();
  const instanceId = process.env.INSTANCE_ID || `api_${process.pid}`;
  const attempts = typeof row.attempts === 'number' ? row.attempts : parseInt(row.attempts || '0');
  const maxAttempts = row.max_attempts == null ? Math.max(1, parseInt(process.env.TASK_MAX_ATTEMPTS || '3')) : (typeof row.max_attempts === 'number' ? row.max_attempts : parseInt(row.max_attempts || '0'));
  const nextRetryAt = row.next_retry_at ? String(row.next_retry_at) : null;
  const leaseExpiresAtDb = row.lease_expires_at ? String(row.lease_expires_at) : null;
  if (nextRetryAt && nextRetryAt > nowStr) return;
  if (leaseExpiresAtDb && leaseExpiresAtDb > nowStr) return;
  if (attempts >= maxAttempts) {
    await pool.query(`UPDATE tasks SET status = 'failed', error = $1, updated_at = $2 WHERE id = $3`, ['超过最大重试次数', nowStr, taskId]);
    return;
  }

  const acquire = await pool.query(
    `UPDATE tasks
     SET status = 'in_progress',
         attempts = COALESCE(attempts, 0) + 1,
         lease_owner = $1,
         lease_expires_at = $2,
         last_started_at = $3,
         updated_at = $3,
         error = NULL
     WHERE id = $4
       AND status IN ('pending','in_progress')
       AND (lease_expires_at IS NULL OR lease_expires_at < $3)
       AND (next_retry_at IS NULL OR next_retry_at <= $3)
       AND (max_attempts IS NULL OR COALESCE(attempts,0) < max_attempts)`,
    [instanceId, leaseExpiresAt, nowStr, taskId]
  );
  if ((acquire?.rowCount || 0) === 0) return;

  const existing = tasks.get(taskId);
  if (!existing) {
    if (!row.inputs) {
      await pool.query(
        `UPDATE tasks SET status = 'failed', error = $1, updated_at = $2, lease_owner = NULL, lease_expires_at = NULL WHERE id = $3`,
        ['任务缺少输入，无法执行', nowStr, taskId]
      );
      return;
    }
    let inputs: GenerateTreeRequest;
    try {
      inputs = JSON.parse(String(row.inputs));
    } catch {
      await pool.query(
        `UPDATE tasks SET status = 'failed', error = $1, updated_at = $2, lease_owner = NULL, lease_expires_at = NULL WHERE id = $3`,
        ['任务输入解析失败，无法执行', nowStr, taskId]
      );
      return;
    }
    const task: Task = {
      id: taskId,
      status: 'pending',
      inputs,
      userId: String(row.user_id || 'default'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    tasks.set(taskId, task);
  }

  try {
    await processTask(taskId);
  } catch (e) {
    const attemptNo = attempts + 1;
    const baseDelay = 5000;
    const delayMs = Math.min(300000, baseDelay * Math.pow(2, Math.max(0, attemptNo - 1)));
    const retryAt = new Date(Date.now() + delayMs).toISOString();
    const willRetry = attemptNo < maxAttempts;
    await pool.query(
      `UPDATE tasks
       SET status = $1,
           error = $2,
           next_retry_at = $3,
           lease_owner = NULL,
           lease_expires_at = NULL,
           updated_at = $4
       WHERE id = $5`,
      [willRetry ? 'pending' : 'failed', (e as Error).message || '任务执行失败', willRetry ? retryAt : null, nowStr, taskId]
    );
    throw e;
  }
}

export const treeController = {
  /**
   * 生成技能树
   */
  async generate(req: Request, res: Response) {
    try {
      const inputs: GenerateTreeRequest = req.body;
      
      if (!inputs.major || !inputs.career || typeof inputs.career !== 'string' || inputs.career.trim() === '') {
        return res.status(400).json({ error: '专业和目标职业是必填项' });
      }

      // 创建任务
      const taskId = uuidv4();
      const userId = (req as any).user?.id || 'default';
      const task: Task = {
        id: taskId,
        status: 'pending',
        inputs: inputs,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      tasks.set(taskId, task);
      const pool = getDb();
      await upsertTaskRow(pool, task);

      if (getTaskQueueMode() === 'redis') {
        const enqueued = await enqueueTask(taskId);
        if (!enqueued) {
          processTask(taskId).catch((e) => logger.error('任务处理失败', e));
        }
      } else {
        processTask(taskId).catch((e) => logger.error('任务处理失败', e));
      }

      // 返回任务 ID
      res.json({ taskId, status: 'pending' });
    } catch (error) {
      logger.error('创建任务失败', error);
      res.status(500).json({ error: error instanceof Error ? error.message : '创建任务失败' });
    }
  },

  /**
   * 获取任务状态
   */
  async getTaskStatus(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const task = tasks.get(taskId);

      const requesterId = (req as any).user?.id || 'default';
      if (task) {
        if (task.userId !== requesterId) {
          return res.status(404).json({ error: '任务不存在' });
        }
        const pool = getDb();
        const metaRes = await pool.query('SELECT attempts, max_attempts, next_retry_at FROM tasks WHERE id = $1 AND user_id = $2', [taskId, requesterId]);
        const meta: any = metaRes.rows?.[0] || {};
        res.json({
          taskId: task.id,
          status: task.status,
          result: task.result,
          error: task.error,
          progress: task.progress,
          phase: task.phase,
          preview: task.preview,
          treeId: task.treeId,
          attempts: meta.attempts == null ? undefined : (typeof meta.attempts === 'number' ? meta.attempts : parseInt(meta.attempts || '0')),
          maxAttempts: meta.max_attempts == null ? undefined : (typeof meta.max_attempts === 'number' ? meta.max_attempts : parseInt(meta.max_attempts || '0')),
          nextRetryAt: meta.next_retry_at ? String(meta.next_retry_at) : undefined,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        });
        return;
      }

      const pool = getDb();
      const dbRes = await pool.query(
        'SELECT id, status, progress, stage, message, tree_id, error, created_at, updated_at, attempts, max_attempts, next_retry_at FROM tasks WHERE id = $1 AND user_id = $2',
        [taskId, requesterId]
      );
      if ((dbRes.rows || []).length === 0) {
        return res.status(404).json({ error: '任务不存在' });
      }
      const row: any = dbRes.rows[0];
      res.json({
        taskId: String(row.id),
        status: String(row.status),
        error: row.error ? String(row.error) : undefined,
        progress: typeof row.progress === 'number' ? row.progress : parseInt(row.progress || '0'),
        phase: row.stage ? String(row.stage) : undefined,
        treeId: row.tree_id ? String(row.tree_id) : undefined,
        attempts: typeof row.attempts === 'number' ? row.attempts : parseInt(row.attempts || '0'),
        maxAttempts: row.max_attempts == null ? undefined : (typeof row.max_attempts === 'number' ? row.max_attempts : parseInt(row.max_attempts || '0')),
        nextRetryAt: row.next_retry_at ? String(row.next_retry_at) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    } catch (error) {
      logger.error('获取任务状态失败', error);
      res.status(500).json({ error: error instanceof Error ? error.message : '获取任务状态失败' });
    }
  },

  async retryTask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const requesterId = (req as any).user?.id || 'default';
      const pool = getDb();
      const nowStr = new Date().toISOString();

      const found = await pool.query(
        'SELECT id, status, inputs, attempts, max_attempts FROM tasks WHERE id = $1 AND user_id = $2',
        [taskId, requesterId]
      );
      if ((found.rows || []).length === 0) {
        return res.status(404).json({ error: '任务不存在' });
      }
      const row: any = found.rows[0];
      const status = String(row.status || '');
      if (status !== 'failed') {
        return res.status(400).json({ error: '仅失败任务可重试' });
      }
      if (!row.inputs) {
        return res.status(400).json({ error: '任务缺少输入，无法重试' });
      }

      await pool.query(
        `UPDATE tasks
         SET status = 'pending',
             error = NULL,
             next_retry_at = NULL,
             lease_owner = NULL,
             lease_expires_at = NULL,
             attempts = 0,
             updated_at = $1
         WHERE id = $2 AND user_id = $3`,
        [nowStr, taskId, requesterId]
      );

      if (getTaskQueueMode() === 'redis') {
        const ok = await enqueueTask(taskId);
        if (!ok) {
          return res.status(500).json({ error: '入队失败，请稍后重试' });
        }
      } else {
        const parsed = JSON.parse(String(row.inputs));
        const task: Task = {
          id: taskId,
          status: 'pending',
          inputs: parsed,
          userId: requesterId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        tasks.set(taskId, task);
        processTask(taskId).catch((e) => logger.error('任务处理失败', e));
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('重试任务失败', error);
      res.status(500).json({ error: '重试失败' });
    }
  },

  async cancelTask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const task = tasks.get(taskId);

      if (!task) {
        return res.status(404).json({ error: '任务不存在' });
      }

      const requesterId = (req as any).user?.id || 'default';
      if (task.userId !== requesterId) {
        return res.status(404).json({ error: '任务不存在' });
      }

      if (task.status === 'completed' || task.status === 'failed') {
        return res.status(400).json({ error: '任务已完成，无法取消' });
      }

      task.cancelled = true;
      task.status = 'failed';
      task.error = '用户取消';
      task.updatedAt = new Date();
      tasks.set(taskId, task);
      notifyTaskUpdate(taskId, { status: 'failed', userId: task.userId, treeId: task.treeId, error: task.error, progress: task.progress, phase: task.phase });
      try {
        const pool = getDb();
        await upsertTaskRow(pool, task);
      } catch (e) {
        logger.warn('任务取消落库失败', { taskId, error: (e as Error).message });
      }

      res.json({ success: true, message: '任务已取消' });
    } catch (error) {
      res.status(500).json({ error: '取消任务失败' });
    }
  },

  /**
   * 获取技能树
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pool = getDb();
      const ids = getAllowedUserIds(req);
      const result = ids.length === 1
        ? await pool.query('SELECT * FROM trees WHERE id = $1 AND user_id = $2', [id, ids[0]])
        : await pool.query('SELECT * FROM trees WHERE id = $1 AND (user_id = $2 OR user_id = $3)', [id, ids[0], ids[1]]);
      const row: any = result.rows[0];

      if (!row) {
        return res.status(404).json({ error: '技能树不存在' });
      }

      const data = validateSkillTreeData(JSON.parse(row.tree_data));
      res.json({ id: row.id, ...data });
    } catch (error) {
      res.status(500).json({ error: '获取失败' });
    }
  },

  /**
   * 导出技能树（带导出元信息）
   */
  async export(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pool = getDb();
      const ids = getAllowedUserIds(req);
      const result = ids.length === 1
        ? await pool.query('SELECT * FROM trees WHERE id = $1 AND user_id = $2', [id, ids[0]])
        : await pool.query('SELECT * FROM trees WHERE id = $1 AND (user_id = $2 OR user_id = $3)', [id, ids[0], ids[1]]);
      const row: any = result.rows[0];

      if (!row) {
        return res.status(404).json({ error: '技能树不存在' });
      }

      const data = validateSkillTreeData(JSON.parse(row.tree_data));
      const payload = {
        exportedAt: new Date().toISOString(),
        format: 'skill-tree-export',
        version: '1.0',
        tree: data
      };

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${buildExportFileName(data.career, 'export')}"`);
      res.send(JSON.stringify(payload, null, 2));
    } catch (error) {
      logger.error('导出技能树失败', error);
      res.status(500).json({ error: '导出失败' });
    }
  },

  /**
   * 导出原始 JSON
   */
  async exportJSON(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pool = getDb();
      const ids = getAllowedUserIds(req);
      const result = ids.length === 1
        ? await pool.query('SELECT * FROM trees WHERE id = $1 AND user_id = $2', [id, ids[0]])
        : await pool.query('SELECT * FROM trees WHERE id = $1 AND (user_id = $2 OR user_id = $3)', [id, ids[0], ids[1]]);
      const row: any = result.rows[0];

      if (!row) {
        return res.status(404).json({ error: '技能树不存在' });
      }

      const data = validateSkillTreeData(JSON.parse(row.tree_data));

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${buildExportFileName(data.career, 'tree')}"`);
      res.send(JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error('导出技能树 JSON 失败', error);
      res.status(500).json({ error: '导出JSON失败' });
    }
  },

  /**
   * 导入技能树数据包
   */
  async import(req: Request, res: Response) {
    try {
      const importedPayload = req.body?.tree && typeof req.body.tree === 'object'
        ? req.body.tree
        : req.body;
      const validatedTree = validateSkillTreeData(importedPayload);
      const treeId = uuidv4();
      const importedTree: SkillTreeData = {
        ...validatedTree,
        id: treeId,
        version: validatedTree.version || '1.0',
        generatedAt: validatedTree.generatedAt || new Date().toISOString()
      };

      const pool = getDb();
      const userId = (req as any).user?.id || 'default';
      await pool.query(
        `INSERT INTO trees (id, user_id, career, tree_data, partial)
         VALUES ($1, $2, $3, $4, $5)`,
        [treeId, userId, importedTree.career, JSON.stringify(importedTree), 0]
      );

      res.json({
        success: true,
        id: treeId,
        data: importedTree
      });
    } catch (error) {
      logger.error('导入技能树失败', error);
      res.status(500).json({ error: error instanceof Error ? error.message : '导入失败' });
    }
  },

  /**
   * 获取列表
   */
  async list(req: Request, res: Response) {
    try {
      const pool = getDb();
      const ids = getAllowedUserIds(req);

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const search = (req.query.search as string || '').trim();

      let countResult;
      if (ids.length === 1) {
        if (search) {
          countResult = await pool.query(
            `SELECT COUNT(*) as total FROM trees WHERE user_id = $1 AND career LIKE $2`,
            [ids[0], `%${search}%`]
          );
        } else {
          countResult = await pool.query(
            `SELECT COUNT(*) as total FROM trees WHERE user_id = $1`,
            [ids[0]]
          );
        }
      } else {
        if (search) {
          countResult = await pool.query(
            `SELECT COUNT(*) as total FROM trees WHERE (user_id = $1 OR user_id = $2) AND career LIKE $3`,
            [ids[0], ids[1], `%${search}%`]
          );
        } else {
          countResult = await pool.query(
            `SELECT COUNT(*) as total FROM trees WHERE user_id = $1 OR user_id = $2`,
            [ids[0], ids[1]]
          );
        }
      }

      const total = parseInt(countResult.rows[0]?.total || '0');

      let result;
      if (ids.length === 1) {
        if (search) {
          result = await pool.query(
            `SELECT id, career, created_at FROM trees WHERE user_id = $1 AND career LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
            [ids[0], `%${search}%`, limit, offset]
          );
        } else {
          result = await pool.query(
            `SELECT id, career, created_at FROM trees WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
            [ids[0], limit, offset]
          );
        }
      } else {
        if (search) {
          result = await pool.query(
            `SELECT id, career, created_at FROM trees WHERE (user_id = $1 OR user_id = $2) AND career LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5`,
            [ids[0], ids[1], `%${search}%`, limit, offset]
          );
        } else {
          result = await pool.query(
            `SELECT id, career, created_at FROM trees WHERE user_id = $1 OR user_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
            [ids[0], ids[1], limit, offset]
          );
        }
      }

      res.json({
        trees: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('获取列表失败', error);
      res.status(500).json({ error: '获取列表失败' });
    }
  },

  /**
   * 更新
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const treeData = validateSkillTreeData(req.body);
      const pool = getDb();
      const ids = getAllowedUserIds(req);
      
      const result = await pool.query(
        `UPDATE trees SET tree_data = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
        [JSON.stringify(treeData), id, ids[0]]
      );

      if ((result.rowCount ?? 0) === 0) {
        return res.status(404).json({ error: '更新失败，技能树不存在' });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: '更新失败' });
    }
  },

  /**
   * 删除
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pool = getDb();
      const ids = getAllowedUserIds(req);
      const result = await pool.query(
        'DELETE FROM trees WHERE id = $1 AND user_id = $2',
        [id, ids[0]]
      );
      
      if ((result.rowCount ?? 0) === 0) {
        return res.status(404).json({ error: '删除失败，技能树不存在' });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: '删除失败' });
    }
  }
};
