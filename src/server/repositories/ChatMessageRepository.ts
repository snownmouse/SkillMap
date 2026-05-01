import { getPool } from '../database';
import type pg from 'pg';

export class ChatMessageRepository {
  private pool: pg.Pool;

  constructor(pool?: pg.Pool) {
    this.pool = pool || getPool();
  }

  async saveMessages(messages: Array<{ id: string; treeId: string; nodeId: string; role: string; content: string; metadata: string | null }>) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const msg of messages) {
        await client.query(
          `INSERT INTO chat_messages (id, tree_id, node_id, role, content, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [msg.id, msg.treeId, msg.nodeId, msg.role, msg.content, msg.metadata]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getMessagesByNode(treeId: string, nodeId: string, limit = 50, offset = 0): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT id, role, content, created_at as timestamp, metadata
       FROM chat_messages
       WHERE tree_id = $1 AND node_id = $2
       ORDER BY created_at ASC
       LIMIT $3 OFFSET $4`,
      [treeId, nodeId, limit, offset]
    );
    return result.rows;
  }

  async getMessageCount(treeId: string, nodeId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM chat_messages
       WHERE tree_id = $1 AND node_id = $2`,
      [treeId, nodeId]
    );
    return parseInt(result.rows[0]?.count || '0');
  }

  async getRecentMessages(treeId: string, nodeId: string, limit = 10): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT id, role, content, created_at as timestamp, metadata
       FROM chat_messages
       WHERE tree_id = $1 AND node_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [treeId, nodeId, limit]
    );
    return result.rows.reverse();
  }

  async getAllNodeIdsForTree(treeId: string): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT node_id FROM chat_messages
       WHERE tree_id = $1
       ORDER BY node_id`,
      [treeId]
    );
    return result.rows.map((r: any) => r.node_id);
  }

  async getConversationHistory(treeId: string, nodeId: string, limit = 20): Promise<string> {
    const rows = await this.getRecentMessages(treeId, nodeId, limit);
    return rows.map((h: any) => `${h.role === 'user' ? '用户' : 'AI'}: ${h.content}`).join('\n');
  }

  async getConversationSummary(treeId: string): Promise<{ nodeId: string; messageCount: number; lastActivity: string | null; lastMessage: string | null }[]> {
    const nodeIds = await this.getAllNodeIdsForTree(treeId);
    const summaries: { nodeId: string; messageCount: number; lastActivity: string | null; lastMessage: string | null }[] = [];

    for (const nodeId of nodeIds) {
      const count = await this.getMessageCount(treeId, nodeId);
      const recentMessages = await this.getRecentMessages(treeId, nodeId, 2);
      
      if (count > 0) {
        summaries.push({
          nodeId,
          messageCount: count,
          lastActivity: recentMessages.length > 0 ? recentMessages[recentMessages.length - 1].timestamp : null,
          lastMessage: recentMessages.length > 0 ? recentMessages[recentMessages.length - 1].content.substring(0, 100) : null,
        });
      }
    }

    return summaries;
  }

  async searchMessages(treeId: string, query: string, limit = 20): Promise<any[]> {
    const sanitizedQuery = query.replace(/[%_\\]/g, '\\$&');
    const result = await this.pool.query(
      `SELECT id, tree_id, node_id, role, content, created_at as timestamp, metadata
       FROM chat_messages
       WHERE tree_id = $1 AND content LIKE $2 ESCAPE '\\'
       ORDER BY created_at DESC
       LIMIT $3`,
      [treeId, `%${sanitizedQuery}%`, limit]
    );
    return result.rows;
  }
}
