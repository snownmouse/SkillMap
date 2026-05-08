import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { generateGrowthPlan, getDimensionDescription, type PlanPath } from '../services/GrowthPathPlanner';
import { validateSkillTreeData } from '../../utils/jsonValidator';
import { getAllowedUserIds } from '../utils/auth';

const VALID_PATHS: PlanPath[] = ['tech', 'management', 'slash', 'grassroot', 'national_strategy', 'startup', 'stable'];

const PATH_NAMES: Record<PlanPath, string> = {
  tech: '技术深耕路线',
  management: '技术管理路线',
  slash: '复合发展路线',
  grassroot: '基层实践路线',
  national_strategy: '重点领域路线',
  startup: '创新创业路线',
  stable: '稳定发展路线'
};

export const goalController = {
  async plan(req: Request, res: Response) {
    try {
      const { treeId, title, description, targetDate, path, maxNodes, weeklyHours, goalNodeId, priorityAdjustments } = req.body || {};
      if (!treeId || typeof treeId !== 'string') {
        return res.status(400).json({ error: 'treeId 必填' });
      }
      const userId = (req as any).user?.id || 'default';
      const pool = getDb();
      const ids = getAllowedUserIds(req);
      const treeResult = ids.length === 1
        ? await pool.query('SELECT * FROM trees WHERE id = $1 AND user_id = $2', [treeId, ids[0]])
        : await pool.query('SELECT * FROM trees WHERE id = $1 AND (user_id = $2 OR user_id = $3)', [treeId, ids[0], ids[1]]);
      const row: any = treeResult.rows[0];
      if (!row) {
        return res.status(404).json({ error: '技能树不存在' });
      }

      const tree = validateSkillTreeData(JSON.parse(row.tree_data));
      const chosenPath: PlanPath = VALID_PATHS.includes(path) ? path : 'tech';
      const plan = generateGrowthPlan(tree, {
        path: chosenPath,
        maxNodes: typeof maxNodes === 'number' ? maxNodes : 60,
        weeklyHours: typeof weeklyHours === 'number' ? weeklyHours : ((req as any).body?.weeklyHours || 10),
        goalNodeId: typeof goalNodeId === 'string' ? goalNodeId : undefined,
        priorityAdjustments: typeof priorityAdjustments === 'object' && priorityAdjustments ? priorityAdjustments : undefined
      });

      const goalId = uuidv4();
      const planId = uuidv4();
      await pool.query(
        `INSERT INTO growth_goals (id, user_id, title, description, target_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [goalId, userId, String(title || tree.career), description ? String(description) : null, targetDate ? String(targetDate) : null]
      );

      await pool.query(
        `INSERT INTO growth_plans (id, goal_id, user_id, active_path, plan_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [planId, goalId, userId, plan.path, JSON.stringify({ treeId, plan, createdAt: new Date().toISOString() })]
      );

      const dimensionDesc = plan.dimension
        ? getDimensionDescription(plan.dimension)
        : '综合发展';

      res.json({
        goalId,
        planId,
        treeId,
        plan,
        meta: {
          pathName: PATH_NAMES[plan.path],
          dimension: plan.dimension,
          dimensionDesc,
          theoryFramework: '生涯规划体系'
        }
      });
    } catch (e) {
      res.status(500).json({ error: '生成成长计划失败' });
    }
  }
};
