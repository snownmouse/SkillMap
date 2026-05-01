import { getPool } from '../database';
import type pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

export class TreeVersionService {
  private pool: pg.Pool;

  constructor(pool?: pg.Pool) {
    this.pool = pool || getPool();
  }

  async createVersion(treeId: string, treeData: any, changeDescription?: string) {
    const maxVersion = await this.pool.query(
      'SELECT COALESCE(MAX(version_number), 0) as max_ver FROM tree_versions WHERE tree_id = $1',
      [treeId]
    );
    const versionNumber = parseInt(maxVersion.rows[0]?.max_ver || '0') + 1;

    const id = uuidv4();

    await this.pool.query(
      `INSERT INTO tree_versions (id, tree_id, version_number, tree_data, change_description, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, treeId, versionNumber, JSON.stringify(treeData), changeDescription || null]
    );

    return { id, treeId, versionNumber, changeDescription, createdAt: new Date().toISOString() };
  }

  async getVersion(versionId: string) {
    const result = await this.pool.query(
      'SELECT * FROM tree_versions WHERE id = $1',
      [versionId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async getVersions(treeId: string, limit = 20, offset = 0) {
    const result = await this.pool.query(
      'SELECT * FROM tree_versions WHERE tree_id = $1 ORDER BY version_number DESC LIMIT $2 OFFSET $3',
      [treeId, limit, offset]
    );
    return result.rows.map(this.mapRow);
  }

  async getVersionCount(treeId: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM tree_versions WHERE tree_id = $1',
      [treeId]
    );
    return parseInt(result.rows[0]?.count || '0');
  }

  async restoreVersion(treeId: string, versionNumber: number) {
    const version = await this.pool.query(
      'SELECT * FROM tree_versions WHERE tree_id = $1 AND version_number = $2',
      [treeId, versionNumber]
    );
    if (version.rows.length === 0) return null;

    const treeData = JSON.parse(version.rows[0].tree_data);

    await this.pool.query(
      "UPDATE trees SET tree_data = $1, updated_at = NOW() WHERE id = $2",
      [version.rows[0].tree_data, treeId]
    );

    await this.createVersion(treeId, treeData, `Restored from version ${versionNumber}`);

    return treeData;
  }

  async getLatestVersion(treeId: string) {
    const result = await this.pool.query(
      'SELECT * FROM tree_versions WHERE tree_id = $1 ORDER BY version_number DESC LIMIT 1',
      [treeId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async deleteOldVersions(treeId: string, keepCount = 10) {
    const count = await this.getVersionCount(treeId);
    if (count <= keepCount) return 0;

    const result = await this.pool.query(
      `DELETE FROM tree_versions WHERE tree_id = $1 AND id NOT IN (
        SELECT id FROM tree_versions WHERE tree_id = $1 ORDER BY version_number DESC LIMIT $2
      )`,
      [treeId, keepCount]
    );

    return result.rowCount ?? 0;
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      treeId: row.tree_id,
      versionNumber: row.version_number,
      treeData: row.tree_data ? JSON.parse(row.tree_data) : null,
      changeDescription: row.change_description,
      createdAt: row.created_at,
    };
  }
}
