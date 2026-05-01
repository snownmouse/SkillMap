import { getPool } from '../database';
import type pg from 'pg';

export class TreeRepository {
  private pool: pg.Pool;

  constructor(pool?: pg.Pool) {
    this.pool = pool || getPool();
  }

  async updateTreeData(treeId: string, treeData: any) {
    await this.pool.query(
      "UPDATE trees SET tree_data = $1, updated_at = NOW() WHERE id = $2",
      [JSON.stringify(treeData), treeId]
    );
  }

  async getTreeData(treeId: string): Promise<any> {
    const result = await this.pool.query('SELECT tree_data FROM trees WHERE id = $1', [treeId]);
    if (result.rows.length === 0) return null;
    return JSON.parse(result.rows[0].tree_data);
  }
}
