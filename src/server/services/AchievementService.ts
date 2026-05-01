import { getPool } from '../database';
import type pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

interface Achievement {
  id: string;
  treeId: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  nodeId?: string;
  earnedAt: string;
}

const ACHIEVEMENT_DEFS: Record<string, { title: string; description: string }> = {
  first_chat: { title: '初次对话', description: '完成了第一次AI对话' },
  node_complete: { title: '技能解锁', description: '完成了一个技能节点的学习' },
  tree_half: { title: '半程达人', description: '技能树完成度达到50%' },
  tree_complete: { title: '技能大师', description: '完成了整个技能树的学习' },
  streak_3: { title: '三日坚持', description: '连续学习3天' },
  streak_7: { title: '周周不断', description: '连续学习7天' },
  streak_30: { title: '月度之星', description: '连续学习30天' },
  all_milestones: { title: '里程碑收集者', description: '达成了所有里程碑' },
  first_plan: { title: '规划先行', description: '创建了第一个学习计划' },
};

export class AchievementService {
  private pool: pg.Pool;

  constructor(pool?: pg.Pool) {
    this.pool = pool || getPool();
  }

  async checkAndAward(treeId: string, userId: string, type: string, context?: any): Promise<Achievement | null> {
    const existing = await this.pool.query(
      'SELECT id FROM achievements WHERE tree_id = $1 AND user_id = $2 AND type = $3',
      [treeId, userId, type]
    );

    if (existing.rows.length > 0) {
      return null;
    }

    const def = ACHIEVEMENT_DEFS[type];
    if (!def) return null;

    const achievement: Achievement = {
      id: uuidv4(),
      treeId,
      userId,
      type,
      title: def.title,
      description: def.description,
      nodeId: context?.nodeId,
      earnedAt: new Date().toISOString(),
    };

    await this.pool.query(
      `INSERT INTO achievements (id, tree_id, user_id, type, title, description, node_id, earned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [achievement.id, achievement.treeId, achievement.userId, achievement.type,
       achievement.title, achievement.description, achievement.nodeId, achievement.earnedAt]
    );

    return achievement;
  }

  async getAchievements(treeId: string, userId: string): Promise<Achievement[]> {
    const result = await this.pool.query(
      'SELECT * FROM achievements WHERE tree_id = $1 AND user_id = $2 ORDER BY earned_at DESC',
      [treeId, userId]
    );
    return result.rows.map(this.mapRow);
  }

  async getAchievementCount(treeId: string, userId: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM achievements WHERE tree_id = $1 AND user_id = $2',
      [treeId, userId]
    );
    return parseInt(result.rows[0]?.count || '0');
  }

  async getRecentAchievements(userId: string, limit = 10): Promise<Achievement[]> {
    const result = await this.pool.query(
      'SELECT * FROM achievements WHERE user_id = $1 ORDER BY earned_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows.map(this.mapRow);
  }

  async getAchievementStats(userId: string): Promise<Record<string, number>> {
    const result = await this.pool.query(
      'SELECT type, COUNT(*) as count FROM achievements WHERE user_id = $1 GROUP BY type',
      [userId]
    );
    const stats: Record<string, number> = {};
    for (const row of result.rows) {
      stats[row.type] = parseInt(row.count);
    }
    return stats;
  }

  private mapRow(row: any): Achievement {
    return {
      id: row.id,
      treeId: row.tree_id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      description: row.description,
      nodeId: row.node_id,
      earnedAt: row.earned_at,
    };
  }
}
