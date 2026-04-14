import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { llmService } from '../llmService';
import { getCheckinChatPrompt } from '../prompts/checkinChat';
import { ChatRequest, ChatResponse } from '../../types/backend';

export const chatController = {
  /**
   * 发送消息
   */
  async sendMessage(req: Request, res: Response) {
    try {
      const { treeId } = req.params;
      const { nodeId, message }: ChatRequest = req.body;

      const db = getDb();
      const treeRow: any = db.prepare('SELECT * FROM trees WHERE id = ?').get(treeId);
      if (!treeRow) return res.status(404).json({ error: '技能树不存在' });

      const treeData = JSON.parse(treeRow.tree_data);
      const node = treeData.nodes[nodeId];
      if (!node) return res.status(404).json({ error: '节点不存在' });

      // 获取历史记录
      const historyRows: any[] = db.prepare(`
        SELECT role, content FROM chat_messages 
        WHERE tree_id = ? AND node_id = ? 
        ORDER BY created_at ASC LIMIT 10
      `).all(treeId, nodeId);

      const historyStr = historyRows.map(h => `${h.role === 'user' ? '用户' : 'AI'}: ${h.content}`).join('\n');
      const treeSummary = `职业: ${treeData.career}, 总结: ${treeData.summary}`;

      const { system, user } = getCheckinChatPrompt({
        nodeName: node.name,
        nodeHistory: historyStr,
        currentProgress: node.progress,
        userMessage: message,
        treeSummary
      });

      const aiResult = await llmService.chatJSON(system, user);

      // 存储消息
      const userMsgId = uuidv4();
      const aiMsgId = uuidv4();
      
      const insertMsg = db.prepare(`
        INSERT INTO chat_messages (id, tree_id, node_id, role, content, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      db.transaction(() => {
        insertMsg.run(userMsgId, treeId, nodeId, 'user', message, null);
        insertMsg.run(aiMsgId, treeId, nodeId, 'assistant', aiResult.reply, JSON.stringify(aiResult));

        // 更新技能树状态
        if (aiResult.progress_update) {
          const newProgress = Math.min(100, Math.max(0, aiResult.progress_update.new_progress));
          treeData.nodes[nodeId].progress = newProgress;
          if (newProgress === 100) treeData.nodes[nodeId].status = 'completed';
          else if (newProgress > 0) treeData.nodes[nodeId].status = 'in_progress';
        }

        // 添加时间线事件
        if (aiResult.timeline_event) {
          treeData.timeline = treeData.timeline || [];
          treeData.timeline.push({
            date: new Date().toISOString(),
            ...aiResult.timeline_event,
            nodeId
          });
        }

        db.prepare('UPDATE trees SET tree_data = ?, updated_at = datetime("now") WHERE id = ?')
          .run(JSON.stringify(treeData), treeId);
      })();

      res.json({
        reply: aiResult.reply,
        progressUpdate: aiResult.progress_update,
        newInsight: aiResult.new_insight,
        nextHook: aiResult.next_hook,
        timelineEvent: aiResult.timeline_event
      });
    } catch (error) {
      console.error('对话失败:', error);
      res.status(500).json({ error: '对话处理失败' });
    }
  },

  /**
   * 获取历史
   */
  async getHistory(req: Request, res: Response) {
    try {
      const { treeId, nodeId } = req.params;
      const db = getDb();
      const rows = db.prepare(`
        SELECT id, role, content, created_at as timestamp, metadata
        FROM chat_messages
        WHERE tree_id = ? AND node_id = ?
        ORDER BY created_at ASC
      `).all(treeId, nodeId);

      res.json({
        messages: rows.map((r: any) => ({
          ...r,
          metadata: r.metadata ? JSON.parse(r.metadata) : null
        }))
      });
    } catch (error) {
      res.status(500).json({ error: '获取历史失败' });
    }
  }
};
