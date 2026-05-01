import { getPool } from '../database';
import { v4 as uuidv4 } from 'uuid';
import type pg from 'pg';

export interface SkillTerm {
  id: string;
  term: string;
  category: string;
  level: number;
  relatedTerms: string[];
  aliases: string[];
  careerId: string;
  source: string;
  status: 'active' | 'pending' | 'rejected';
  createdAt: Date;
  createdBy?: string;
}

export class SkillTermRepository {
  private pool: pg.Pool;

  constructor(pool?: pg.Pool) {
    this.pool = pool || getPool();
  }

  async add(term: Omit<SkillTerm, 'id' | 'createdAt'>): Promise<SkillTerm> {
    const id = uuidv4();
    const createdAt = new Date();

    await this.pool.query(
      `INSERT INTO skill_terms (id, term, category, level, related_terms, aliases, career_id, source, status, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        term.term,
        term.category,
        term.level,
        JSON.stringify(term.relatedTerms || []),
        JSON.stringify(term.aliases || []),
        term.careerId,
        term.source,
        term.status,
        createdAt.toISOString(),
        term.createdBy || null
      ]
    );

    return { ...term, id, createdAt };
  }

  async getById(id: string): Promise<SkillTerm | null> {
    const result = await this.pool.query(`SELECT * FROM skill_terms WHERE id = $1`, [id]);
    if (result.rows.length === 0) return null;
    return this.deserialize(result.rows[0]);
  }

  async getByCareer(careerId: string): Promise<SkillTerm[]> {
    const result = await this.pool.query(
      `SELECT * FROM skill_terms
       WHERE career_id = $1 AND status = 'active'
       ORDER BY level ASC, term ASC`,
      [careerId]
    );
    return result.rows.map(row => this.deserialize(row));
  }

  async getByCategory(careerId: string, category: string): Promise<SkillTerm[]> {
    const result = await this.pool.query(
      `SELECT * FROM skill_terms
       WHERE career_id = $1 AND category = $2 AND status = 'active'
       ORDER BY level ASC, term ASC`,
      [careerId, category]
    );
    return result.rows.map(row => this.deserialize(row));
  }

  async getAllCategories(careerId: string): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT category FROM skill_terms
       WHERE career_id = $1 AND status = 'active'
       ORDER BY category`,
      [careerId]
    );
    return result.rows.map((row: any) => row.category);
  }

  async search(term: string, limit: number = 20): Promise<SkillTerm[]> {
    const result = await this.pool.query(
      `SELECT * FROM skill_terms
       WHERE status = 'active'
         AND (term LIKE $1 OR aliases LIKE $1)
       ORDER BY term
       LIMIT $2`,
      [`%${term}%`, limit]
    );
    return result.rows.map(row => this.deserialize(row));
  }

  async update(id: string, updates: Partial<Omit<SkillTerm, 'id' | 'createdAt'>>): Promise<boolean> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.term !== undefined) {
      setClauses.push(`term = $${paramIndex++}`);
      values.push(updates.term);
    }
    if (updates.category !== undefined) {
      setClauses.push(`category = $${paramIndex++}`);
      values.push(updates.category);
    }
    if (updates.level !== undefined) {
      setClauses.push(`level = $${paramIndex++}`);
      values.push(updates.level);
    }
    if (updates.relatedTerms !== undefined) {
      setClauses.push(`related_terms = $${paramIndex++}`);
      values.push(JSON.stringify(updates.relatedTerms));
    }
    if (updates.aliases !== undefined) {
      setClauses.push(`aliases = $${paramIndex++}`);
      values.push(JSON.stringify(updates.aliases));
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (setClauses.length === 0) return false;

    values.push(id);
    const result = await this.pool.query(
      `UPDATE skill_terms SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return (result.rowCount ?? 0) > 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM skill_terms WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getStats(careerId?: string): Promise<{ total: number; byCategory: Record<string, number>; byLevel: Record<number, number> }> {
    let query = `SELECT category, level, COUNT(*) as count FROM skill_terms WHERE status = 'active'`;
    const params: any[] = [];

    if (careerId) {
      query += ` AND career_id = $1`;
      params.push(careerId);
    }

    query += ` GROUP BY category, level`;

    const result = await this.pool.query(query, params);

    const byCategory: Record<string, number> = {};
    const byLevel: Record<number, number> = {};
    let total = 0;

    for (const row of result.rows) {
      byCategory[row.category] = (byCategory[row.category] || 0) + parseInt(row.count);
      byLevel[row.level] = (byLevel[row.level] || 0) + parseInt(row.count);
      total += parseInt(row.count);
    }

    return { total, byCategory, byLevel };
  }

  private deserialize(row: any): SkillTerm {
    return {
      id: row.id,
      term: row.term,
      category: row.category,
      level: row.level,
      relatedTerms: row.related_terms ? JSON.parse(row.related_terms) : [],
      aliases: row.aliases ? JSON.parse(row.aliases) : [],
      careerId: row.career_id,
      source: row.source,
      status: row.status,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by
    };
  }
}

export const skillTermRepository = new SkillTermRepository();
