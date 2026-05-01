import { getPool } from '../database';
import type pg from 'pg';
import { SkillTermRepository } from '../repositories';

export class QualityAssessmentService {
  private pool: pg.Pool;
  private skillTermRepo: SkillTermRepository;

  constructor(pool?: pg.Pool, skillTermRepo?: SkillTermRepository) {
    this.pool = pool || getPool();
    this.skillTermRepo = skillTermRepo || new SkillTermRepository();
  }

  async assess(treeId: string, treeData: any): Promise<{
    overallScore: number;
    structureScore: number;
    contentScore: number;
    details: any;
  }> {
    const structureScore = this.assessStructure(treeData);
    const contentScore = await this.assessContent(treeData);
    const overallScore = Math.round(structureScore * 0.4 + contentScore * 0.6);

    await this.pool.query(
      `INSERT INTO tree_quality_scores (id, tree_id, overall_score, structure_score, content_score, details, assessed_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())
       ON CONFLICT (tree_id) DO UPDATE SET
         overall_score = EXCLUDED.overall_score,
         structure_score = EXCLUDED.structure_score,
         content_score = EXCLUDED.content_score,
         details = EXCLUDED.details,
         assessed_at = NOW()`,
      [treeId, overallScore, structureScore, contentScore, JSON.stringify({ structureScore, contentScore })]
    );

    return { overallScore, structureScore, contentScore, details: { structureScore, contentScore } };
  }

  async getScore(treeId: string) {
    const result = await this.pool.query(
      'SELECT * FROM tree_quality_scores WHERE tree_id = $1',
      [treeId]
    );
    if (result.rows.length === 0) return null;
    return {
      overallScore: result.rows[0].overall_score,
      structureScore: result.rows[0].structure_score,
      contentScore: result.rows[0].content_score,
      userFeedbackScore: result.rows[0].user_feedback_score,
      details: result.rows[0].details ? (typeof result.rows[0].details === 'string' ? JSON.parse(result.rows[0].details) : result.rows[0].details) : null,
      assessedAt: result.rows[0].assessed_at,
    };
  }

  async recordFeedback(treeId: string, userId: string, rating: number, issues?: string[], comment?: string) {
    const id = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    await this.pool.query(
      `INSERT INTO tree_feedback (id, tree_id, user_id, rating, issues, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [id, treeId, userId, rating, issues ? JSON.stringify(issues) : null, comment || null]
    );

    await this.updateFeedbackScore(treeId);
  }

  private async updateFeedbackScore(treeId: string) {
    const result = await this.pool.query(
      'SELECT AVG(rating) as avg_rating FROM tree_feedback WHERE tree_id = $1',
      [treeId]
    );

    const avgRating = parseFloat(result.rows[0]?.avg_rating || '0');
    const normalizedScore = Math.round((avgRating / 5) * 100);

    await this.pool.query(
      'UPDATE tree_quality_scores SET user_feedback_score = $1 WHERE tree_id = $2',
      [normalizedScore, treeId]
    );
  }

  private assessStructure(treeData: any): number {
    if (!treeData || !treeData.nodes) return 0;

    const nodes = Object.values(treeData.nodes) as any[];
    const nonMetaNodes = nodes.filter(n => n.category !== 'meta');

    if (nonMetaNodes.length === 0) return 0;

    let score = 50;

    if (nonMetaNodes.length >= 5 && nonMetaNodes.length <= 30) score += 20;
    else if (nonMetaNodes.length >= 3) score += 10;

    const categories = new Set(nonMetaNodes.map(n => n.category));
    if (categories.size >= 3) score += 15;
    else if (categories.size >= 2) score += 8;

    const nodesWithDeps = nonMetaNodes.filter(n => n.dependencies && n.dependencies.length > 0);
    if (nodesWithDeps.length > 0 && nodesWithDeps.length < nonMetaNodes.length) score += 15;

    return Math.min(100, score);
  }

  private async assessContent(treeData: any): Promise<number> {
    if (!treeData || !treeData.nodes) return 0;

    const nodes = Object.values(treeData.nodes) as any[];
    const nonMetaNodes = nodes.filter(n => n.category !== 'meta');

    if (nonMetaNodes.length === 0) return 0;

    let score = 40;

    const nodesWithDesc = nonMetaNodes.filter(n => n.description && n.description.length > 20);
    const descRatio = nodesWithDesc.length / nonMetaNodes.length;
    score += Math.round(descRatio * 30);

    try {
      const careerId = treeData.career || '';
      if (careerId) {
        const terms = await this.skillTermRepo.getByCareer(careerId);
        if (terms.length > 0) {
          const nodeNames = nonMetaNodes.map(n => n.name?.toLowerCase() || '');
          const matchingTerms = terms.filter(t =>
            nodeNames.some(name => name.includes(t.term.toLowerCase()) || t.term.toLowerCase().includes(name))
          );
          const matchRatio = matchingTerms.length / terms.length;
          score += Math.round(matchRatio * 30);
        }
      }
    } catch {
      score += 10;
    }

    return Math.min(100, score);
  }
}
