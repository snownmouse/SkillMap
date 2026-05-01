import { getPool } from '../database';
import type pg from 'pg';

export class AbilityRepository {
  private pool: pg.Pool;

  constructor(pool?: pg.Pool) {
    this.pool = pool || getPool();
  }

  async findExistingAbility(treeId: string, skill: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT id, confidence FROM user_abilities WHERE tree_id = $1 AND skill = $2',
      [treeId, skill]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async updateAbility(abilityId: string, confidence: string, nodeId: string) {
    await this.pool.query(
      "UPDATE user_abilities SET confidence = $1, node_id = $2, discovered_at = NOW() WHERE id = $3",
      [confidence, nodeId, abilityId]
    );
  }

  async insertAbility(ability: { id: string; treeId: string; skill: string; confidence: string; nodeId: string }) {
    await this.pool.query(
      `INSERT INTO user_abilities (id, tree_id, skill, confidence, source, node_id)
       VALUES ($1, $2, $3, $4, 'chat', $5)`,
      [ability.id, ability.treeId, ability.skill, ability.confidence, ability.nodeId]
    );
  }
}
