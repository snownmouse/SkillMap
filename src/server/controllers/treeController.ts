import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { llmService } from '../llmService';
import { getGenerateTreePrompt } from '../prompts/generateTree';
import { GenerateTreeRequest, SkillTreeData } from '../../types/backend';

// 任务状态类型
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

// 任务接口
interface Task {
  id: string;
  status: TaskStatus;
  inputs: GenerateTreeRequest;
  result?: { id: string; data: SkillTreeData };
  error?: string;
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
    // 更新任务状态为处理中
    task.status = 'in_progress';
    task.updatedAt = new Date();
    tasks.set(taskId, task);

    console.log('=== 开始生成技能树 ===');
    console.log('请求体:', JSON.stringify(task.inputs, null, 2));

    // 生成技能树
    const { system, user } = getGenerateTreePrompt(task.inputs);
    const treeData: SkillTreeData = await llmService.chatJSON(system, user);

    // 补充元数据
    const treeId = uuidv4();
    treeData.id = treeId;
    treeData.version = treeData.version || "1.0";
    treeData.generatedAt = new Date().toISOString();

    // 存入数据库
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO trees (id, career, tree_data)
      VALUES (?, ?, ?)
    `);
    stmt.run(treeId, task.inputs.career, JSON.stringify(treeData));

    // 更新任务状态为完成
    task.status = 'completed';
    task.result = { id: treeId, data: treeData };
    task.updatedAt = new Date();
    tasks.set(taskId, task);

    console.log('=== 生成技能树完成 ===');
  } catch (error) {
    console.error('生成技能树失败:', error);
    // 更新任务状态为失败
    task.status = 'failed';
    task.error = error instanceof Error ? error.message : '生成失败';
    task.updatedAt = new Date();
    tasks.set(taskId, task);
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
      const task: Task = {
        id: taskId,
        status: 'pending',
        inputs: inputs,
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

      res.json({
        taskId: task.id,
        status: task.status,
        result: task.result,
        error: task.error,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      });
    } catch (error) {
      console.error('获取任务状态失败:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : '获取任务状态失败' });
    }
  },

  /**
   * 获取技能树
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const db = getDb();
      const row: any = db.prepare('SELECT * FROM trees WHERE id = ?').get(id);

      if (!row) {
        return res.status(404).json({ error: '技能树不存在' });
      }

      const data = JSON.parse(row.tree_data);
      res.json({ id: row.id, ...data });
    } catch (error) {
      res.status(500).json({ error: '获取失败' });
    }
  },

  /**
   * 获取列表
   */
  async list(req: Request, res: Response) {
    try {
      const db = getDb();
      const rows = db.prepare('SELECT id, career, created_at FROM trees ORDER BY created_at DESC').all();
      res.json({ trees: rows });
    } catch (error) {
      res.status(500).json({ error: '获取列表失败' });
    }
  },

  /**
   * 更新
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const treeData = req.body;
      const db = getDb();
      
      const stmt = db.prepare(`
        UPDATE trees SET tree_data = ?, updated_at = datetime('now') WHERE id = ?
      `);
      const result = stmt.run(JSON.stringify(treeData), id);

      if (result.changes === 0) {
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
      const db = getDb();
      const result = db.prepare('DELETE FROM trees WHERE id = ?').run(id);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: '删除失败，技能树不存在' });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: '删除失败' });
    }
  }
};
