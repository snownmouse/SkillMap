import { getPool } from '../database';
import type pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

export class LearningPlanService {
  private pool: pg.Pool;

  constructor(pool?: pg.Pool) {
    this.pool = pool || getPool();
  }

  async createPlan(treeId: string, userId: string, planData: any) {
    const id = uuidv4();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO learning_plans (id, tree_id, user_id, title, description, focus_node_ids, weekly_hours, daily_tasks, start_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)`,
      [
        id, treeId, userId, planData.title, planData.description || null,
        JSON.stringify(planData.focusNodeIds || []),
        planData.weeklyHours || 10,
        JSON.stringify(planData.dailyTasks || {}),
        planData.startDate || now,
        now, now
      ]
    );

    return { id, ...planData, status: 'active', createdAt: now };
  }

  async getPlan(planId: string) {
    const result = await this.pool.query(
      'SELECT * FROM learning_plans WHERE id = $1',
      [planId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async getPlansByTree(treeId: string, userId: string) {
    const result = await this.pool.query(
      'SELECT * FROM learning_plans WHERE tree_id = $1 AND user_id = $2 ORDER BY created_at DESC',
      [treeId, userId]
    );
    return result.rows.map(this.mapRow);
  }

  async getActivePlan(treeId: string, userId: string) {
    const result = await this.pool.query(
      "SELECT * FROM learning_plans WHERE tree_id = $1 AND user_id = $2 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [treeId, userId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async updatePlan(planId: string, updates: any) {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.focusNodeIds !== undefined) {
      setClauses.push(`focus_node_ids = $${paramIndex++}`);
      values.push(JSON.stringify(updates.focusNodeIds));
    }
    if (updates.weeklyHours !== undefined) {
      setClauses.push(`weekly_hours = $${paramIndex++}`);
      values.push(updates.weeklyHours);
    }
    if (updates.dailyTasks !== undefined) {
      setClauses.push(`daily_tasks = $${paramIndex++}`);
      values.push(JSON.stringify(updates.dailyTasks));
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (setClauses.length === 0) return null;

    setClauses.push(`updated_at = NOW()`);
    values.push(planId);

    const result = await this.pool.query(
      `UPDATE learning_plans SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return (result.rowCount ?? 0) > 0 ? this.getPlan(planId) : null;
  }

  async deletePlan(planId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM learning_plans WHERE id = $1',
      [planId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async completePlan(planId: string) {
    return this.updatePlan(planId, { status: 'completed' });
  }

  async abandonPlan(planId: string) {
    return this.updatePlan(planId, { status: 'abandoned' });
  }

  async getPlanCount(treeId: string, userId: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM learning_plans WHERE tree_id = $1 AND user_id = $2',
      [treeId, userId]
    );
    return parseInt(result.rows[0]?.count || '0');
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      treeId: row.tree_id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      focusNodeIds: row.focus_node_ids ? JSON.parse(row.focus_node_ids) : [],
      weeklyHours: row.weekly_hours,
      dailyTasks: row.daily_tasks ? JSON.parse(row.daily_tasks) : {},
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
