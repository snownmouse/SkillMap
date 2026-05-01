import { getPool } from '../database';
import type pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

export class CacheService {
  private pool: pg.Pool;

  constructor(pool?: pg.Pool) {
    this.pool = pool || getPool();
  }

  async getCachedTree(cacheKey: string): Promise<any | null> {
    const result = await this.pool.query(
      "SELECT tree_data, similarity_score, prompt_version FROM tree_cache WHERE cache_key = $1 AND expires_at > NOW()",
      [cacheKey]
    );

    if (result.rows.length === 0) return null;

    this.updateHitCount(cacheKey).catch(() => {});

    return {
      treeData: JSON.parse(result.rows[0].tree_data),
      similarityScore: result.rows[0].similarity_score,
      promptVersion: result.rows[0].prompt_version,
    };
  }

  async cacheTree(cacheKey: string, treeData: any, requestHash: string, similarityScore: number, promptVersion: string, ttlHours = 24) {
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    await this.pool.query(
      `INSERT INTO tree_cache (id, cache_key, tree_data, request_hash, similarity_score, prompt_version, expires_at, hit_count, last_accessed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW())
       ON CONFLICT (cache_key) DO UPDATE SET
         tree_data = EXCLUDED.tree_data,
         request_hash = EXCLUDED.request_hash,
         similarity_score = EXCLUDED.similarity_score,
         prompt_version = EXCLUDED.prompt_version,
         expires_at = EXCLUDED.expires_at,
         hit_count = 0,
         last_accessed_at = NOW()`,
      [id, cacheKey, JSON.stringify(treeData), requestHash, similarityScore, promptVersion, expiresAt]
    );
  }

  async findSimilarCachedTree(requestHash: string, minSimilarity = 0.85): Promise<any | null> {
    const result = await this.pool.query(
      `SELECT tree_data, similarity_score, cache_key FROM tree_cache
       WHERE request_hash = $1 AND similarity_score >= $2 AND expires_at > NOW()
       ORDER BY similarity_score DESC LIMIT 1`,
      [requestHash, minSimilarity]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    this.updateHitCount(row.cache_key).catch(() => {});

    return {
      treeData: JSON.parse(row.tree_data),
      similarityScore: row.similarity_score,
      cacheKey: row.cache_key,
    };
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.pool.query(
      "DELETE FROM tree_cache WHERE expires_at <= NOW()"
    );
    return result.rowCount ?? 0;
  }

  async getStats(): Promise<{ totalEntries: number; activeEntries: number; expiredEntries: number; avgHitCount: number; cacheSizeKB: number }> {
    const totalResult = await this.pool.query('SELECT COUNT(*) as count FROM tree_cache');
    const activeResult = await this.pool.query("SELECT COUNT(*) as count FROM tree_cache WHERE expires_at > NOW()");
    const hitResult = await this.pool.query("SELECT COALESCE(AVG(hit_count), 0) as avg_hits FROM tree_cache WHERE expires_at > NOW()");

    const totalEntries = parseInt(totalResult.rows[0]?.count || '0');
    const activeEntries = parseInt(activeResult.rows[0]?.count || '0');
    const avgHitCount = parseFloat(hitResult.rows[0]?.avg_hits || '0');

    return {
      totalEntries,
      activeEntries,
      expiredEntries: totalEntries - activeEntries,
      avgHitCount: Math.round(avgHitCount * 100) / 100,
      cacheSizeKB: 0,
    };
  }

  async invalidateCache(cacheKey: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM tree_cache WHERE cache_key = $1',
      [cacheKey]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async invalidateAllCache(): Promise<number> {
    const result = await this.pool.query('DELETE FROM tree_cache');
    return result.rowCount ?? 0;
  }

  private async updateHitCount(cacheKey: string) {
    await this.pool.query(
      "UPDATE tree_cache SET hit_count = hit_count + 1, last_accessed_at = NOW() WHERE cache_key = $1",
      [cacheKey]
    );
  }
}
