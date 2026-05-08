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

    console.log('=== 开始生成技能树 ===');
    console.log('请求体:', JSON.stringify(task.inputs, null, 2));

    const pool = getDb();

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
      console.log('=== 生成技能树完成 ===');
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

    console.log('=== 生成技能树完成 ===');
  } catch (error) {
    console.error('生成技能树失败:', error);
    // 更新任务状态为失败
    task.status = 'failed';
    task.error = error instanceof Error ? error.message : '生成失败';
    task.updatedAt = new Date();
    tasks.set(taskId, task);
    notifyTaskUpdate(taskId, { status: 'failed', userId: task.userId, treeId: task.treeId, error: task.error, progress: task.progress, phase: task.phase });
  }
}

export const treeController = {
  /**
   * 生成技能树
   */
  async generate(req: Request, res: Response) {
    try {
      const inputs: GenerateTreeRequest = req.body;
      console.log('=== 接收到生成技能树请求 ===');
      console.log('请求体:', JSON.stringify(inputs, null, 2));
      console.log('inputs.career:', inputs.career);
      console.log('typeof inputs.career:', typeof inputs.career);
      console.log('inputs.career.trim():', inputs.career?.trim());
      
      if (!inputs.major || !inputs.career || typeof inputs.career !== 'string' || inputs.career.trim() === '') {
        console.log('验证失败，返回 400 错误');
        return res.status(400).json({ error: '专业和目标职业是必填项' });
      }
      console.log('验证成功，创建任务');

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

      // 后台处理任务
      processTask(taskId).catch(console.error);

      // 返回任务 ID
      res.json({ taskId, status: 'pending' });
    } catch (error) {
      console.error('创建任务失败:', error);
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

      if (!task) {
        return res.status(404).json({ error: '任务不存在' });
      }

      const requesterId = (req as any).user?.id || 'default';
      if (task.userId !== requesterId) {
        return res.status(404).json({ error: '任务不存在' });
      }

      res.json({
        taskId: task.id,
        status: task.status,
        result: task.result,
        error: task.error,
        progress: task.progress,
        phase: task.phase,
        preview: task.preview,
        treeId: task.treeId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      });
    } catch (error) {
      console.error('获取任务状态失败:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : '获取任务状态失败' });
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
      console.error('导出技能树失败:', error);
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
      console.error('导出技能树 JSON 失败:', error);
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
      console.error('导入技能树失败:', error);
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
      console.error('获取列表失败:', error);
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
