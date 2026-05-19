import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { llmService } from '../llmService';
import { getCheckinChatPrompt } from '../prompts/checkinChat';
import { getChatSummaryPrompt } from '../prompts/chatSummary';
import { getLearningSuggestionPrompt } from '../prompts/learningSuggestion';
import { ChatRequest, ChatResponse } from '../../types/backend';
import { BloomLevel, CoachSnapshot, KolbStage } from '../../types/skillTree';
import { getAllowedUserIds } from '../utils/auth';
import { modelRegistry } from '../agents';
import { ILLMProvider } from '../llmProviders/base';

const COACH_ENABLED = process.env.ORCHESTRATOR_ENABLED !== 'false';

function getCoachProvider(): ILLMProvider | undefined {
  return COACH_ENABLED ? modelRegistry.getCoach() : undefined;
}

async function withClient<T>(pool: any, fn: (client: any) => Promise<T>): Promise<T> {
  if (pool && typeof pool.connect === 'function') {
    const client = await pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }
  return await fn(pool);
}

function normalizeChatResult(aiResult: any, fallbackNodeId: string, currentProgress: number): ChatResponse & {
  latestCoaching: CoachSnapshot | null;
} {
  const bloomAssessment = aiResult.bloomAssessment || aiResult.bloom_assessment
    ? {
        currentLevel: (aiResult.bloomAssessment?.currentLevel || aiResult.bloom_assessment?.current_level || 'understand') as BloomLevel,
        evidence: aiResult.bloomAssessment?.evidence || aiResult.bloom_assessment?.evidence || '基于最近一次对话进行判断',
        confidence: aiResult.bloomAssessment?.confidence || aiResult.bloom_assessment?.confidence || 'medium'
      }
    : undefined;

  const kolbPrompt = aiResult.kolbPrompt || aiResult.kolb_prompt
    ? {
        stage: (aiResult.kolbPrompt?.stage || aiResult.kolb_prompt?.stage || 'reflective') as KolbStage,
        question: aiResult.kolbPrompt?.question || aiResult.kolb_prompt?.question || '回看这次练习，你最想调整哪里？'
      }
    : undefined;

  const rawProgress = aiResult.progressUpdate || aiResult.progress_update;
  const nextProgress = typeof rawProgress?.newProgress === 'number'
    ? rawProgress.newProgress
    : typeof rawProgress?.new_progress === 'number'
      ? rawProgress.new_progress
      : undefined;

  const rawIsStuck = rawProgress?.isStuck ?? rawProgress?.is_stuck;
  const isStuck = typeof rawIsStuck === 'boolean'
    ? rawIsStuck
    : typeof rawIsStuck === 'string'
      ? rawIsStuck.trim().toLowerCase() === 'true'
      : undefined;

  const progressUpdate = typeof nextProgress === 'number'
    ? {
        nodeId: rawProgress?.nodeId || rawProgress?.node_id || fallbackNodeId,
        newProgress: Math.max(0, Math.min(100, nextProgress)),
        reason: rawProgress?.reason || '根据本次对话进行了进度调整',
        ...(typeof isStuck === 'boolean' ? { isStuck } : {})
      }
    : undefined;

  const latestCoaching: CoachSnapshot | null = (
    bloomAssessment ||
    kolbPrompt ||
    aiResult.deliberatePracticeTip ||
    aiResult.deliberate_practice_tip ||
    aiResult.nextChallenge ||
    aiResult.next_challenge ||
    aiResult.growthMindsetPhrase ||
    aiResult.growth_mindset_phrase ||
    aiResult.nextHook ||
    aiResult.next_hook
  ) ? {
    bloomAssessment,
    kolbPrompt,
    deliberatePracticeTip: aiResult.deliberatePracticeTip || aiResult.deliberate_practice_tip,
    nextChallenge: aiResult.nextChallenge || aiResult.next_challenge,
    growthMindsetPhrase: aiResult.growthMindsetPhrase || aiResult.growth_mindset_phrase,
    nextHook: aiResult.nextHook || aiResult.next_hook,
    summary: aiResult.timelineEvent?.summary || aiResult.timeline_event?.summary || `当前进度 ${progressUpdate?.newProgress ?? currentProgress}%`,
    updatedAt: new Date().toISOString()
  } : null;

  return {
    reply: aiResult.reply || '我已经收到你的复盘内容，我们继续拆解下一步。',
    bloomAssessment,
    kolbPrompt,
    progressUpdate,
    newInsight: aiResult.newInsight || aiResult.new_insight,
    deliberatePracticeTip: aiResult.deliberatePracticeTip || aiResult.deliberate_practice_tip,
    nextChallenge: aiResult.nextChallenge || aiResult.next_challenge,
    growthMindsetPhrase: aiResult.growthMindsetPhrase || aiResult.growth_mindset_phrase,
    nextHook: aiResult.nextHook || aiResult.next_hook,
    timelineEvent: aiResult.timelineEvent || aiResult.timeline_event,
    latestCoaching
  };
}

export const chatController = {
  /**
   * 发送消息
   */
  async sendMessage(req: Request, res: Response) {
    try {
      const { treeId } = req.params;
      const { nodeId, message }: ChatRequest = req.body;

      const pool = getDb();
      const ids = getAllowedUserIds(req);
      const treeResult = ids.length === 1
        ? await pool.query('SELECT * FROM trees WHERE id = $1 AND user_id = $2', [treeId, ids[0]])
        : await pool.query('SELECT * FROM trees WHERE id = $1 AND (user_id = $2 OR user_id = $3)', [treeId, ids[0], ids[1]]);
      const treeRow: any = treeResult.rows[0];
      if (!treeRow) return res.status(404).json({ error: '技能树不存在' });

      const treeData = JSON.parse(treeRow.tree_data);
      const node = treeData.nodes[nodeId];
      if (!node) return res.status(404).json({ error: '节点不存在' });

      // 获取历史记录
      const historyResult = await pool.query(
        `SELECT role, content FROM chat_messages 
         WHERE tree_id = $1 AND node_id = $2 
         ORDER BY created_at ASC LIMIT 10`,
        [treeId, nodeId]
      );
      const historyRows: any[] = historyResult.rows;

      const historyStr = historyRows.map(h => `${h.role === 'user' ? '用户' : 'AI'}: ${h.content}`).join('\n');
      const treeSummary = `职业: ${treeData.career}, 总结: ${treeData.summary}`;

      const { system, user } = getCheckinChatPrompt({
        nodeId,
        nodeName: node.name,
        nodeHistory: historyStr,
        currentProgress: node.progress,
        userMessage: message,
        treeSummary
      });

      const aiResult = normalizeChatResult(
        await llmService.chatJSON(system, user, getCoachProvider()),
        nodeId,
        node.progress
      );
      const progressUpdate = aiResult.progressUpdate;

      // 存储消息
      const userMsgId = uuidv4();
      const aiMsgId = uuidv4();
      
      await withClient(pool, async (client) => {
        await client.query('BEGIN');
        try {
          await client.query(
            `INSERT INTO chat_messages (id, tree_id, node_id, role, content, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userMsgId, treeId, nodeId, 'user', message, null]
          );
          await client.query(
            `INSERT INTO chat_messages (id, tree_id, node_id, role, content, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [aiMsgId, treeId, nodeId, 'assistant', aiResult.reply, JSON.stringify(aiResult)]
          );

          if (progressUpdate) {
            const newProgress = Math.min(100, Math.max(0, progressUpdate.newProgress));
            treeData.nodes[nodeId].progress = newProgress;
            if (newProgress === 100) treeData.nodes[nodeId].status = 'completed';
            else if (newProgress > 0) treeData.nodes[nodeId].status = 'in_progress';
          }

          treeData.nodes[nodeId].aiPendingMessage = aiResult.nextHook || treeData.nodes[nodeId].aiPendingMessage;
          treeData.nodes[nodeId].latestCoaching = aiResult.latestCoaching;
          treeData.nodes[nodeId].lastActive = new Date().toISOString();

          if (aiResult.timelineEvent) {
            treeData.timeline = treeData.timeline || [];
            treeData.timeline.push({
              date: new Date().toISOString(),
              ...aiResult.timelineEvent,
              nodeId
            });
          }

          await client.query(
            `UPDATE trees SET tree_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [JSON.stringify(treeData), treeId]
          );

          await client.query('COMMIT');
        } catch (e) {
          try {
            await client.query('ROLLBACK');
          } catch {
          }
          throw e;
        }
      });

      res.json({
        reply: aiResult.reply,
        progressUpdate,
        bloomAssessment: aiResult.bloomAssessment,
        kolbPrompt: aiResult.kolbPrompt,
        newInsight: aiResult.newInsight,
        deliberatePracticeTip: aiResult.deliberatePracticeTip,
        nextChallenge: aiResult.nextChallenge,
        growthMindsetPhrase: aiResult.growthMindsetPhrase,
        nextHook: aiResult.nextHook,
        timelineEvent: aiResult.timelineEvent
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
      const pool = getDb();
      const ids = getAllowedUserIds(req);
      const treeResult = ids.length === 1
        ? await pool.query('SELECT id FROM trees WHERE id = $1 AND user_id = $2', [treeId, ids[0]])
        : await pool.query('SELECT id FROM trees WHERE id = $1 AND (user_id = $2 OR user_id = $3)', [treeId, ids[0], ids[1]]);
      if (treeResult.rows.length === 0) {
        return res.status(404).json({ error: '技能树不存在' });
      }

      const result = await pool.query(
        `SELECT id, role, content, created_at as timestamp, metadata
         FROM chat_messages
         WHERE tree_id = $1 AND node_id = $2
         ORDER BY created_at ASC`,
        [treeId, nodeId]
      );
      const rows = result.rows;

      res.json({
        messages: rows.map((r: any) => ({
          ...r,
          metadata: (() => {
            if (!r.metadata) return null;
            try {
              return JSON.parse(r.metadata);
            } catch {
              return null;
            }
          })()
        }))
      });
    } catch (error) {
      res.status(500).json({ error: '获取历史失败' });
    }
  },

  async getSummary(req: Request, res: Response) {
    try {
      const { treeId, nodeId } = req.params;
      const pool = getDb();
      const ids = getAllowedUserIds(req);
      const treeResult = ids.length === 1
        ? await pool.query('SELECT * FROM trees WHERE id = $1 AND user_id = $2', [treeId, ids[0]])
        : await pool.query('SELECT * FROM trees WHERE id = $1 AND (user_id = $2 OR user_id = $3)', [treeId, ids[0], ids[1]]);
      const treeRow: any = treeResult.rows[0];
      if (!treeRow) return res.status(404).json({ error: '技能树不存在' });

      const treeData = JSON.parse(treeRow.tree_data);
      const node = treeData.nodes[nodeId];
      if (!node) return res.status(404).json({ error: '节点不存在' });

      const historyResult = await pool.query(
        `SELECT role, content FROM chat_messages
         WHERE tree_id = $1 AND node_id = $2
         ORDER BY created_at ASC`,
        [treeId, nodeId]
      );
      const historyRows: any[] = historyResult.rows;
      if (historyRows.length === 0) {
        return res.json({ summary: null, message: '暂无对话记录，无法生成摘要' });
      }

      const conversationHistory = historyRows.map(h => `${h.role === 'user' ? '用户' : 'AI'}: ${h.content}`).join('\n');
      const treeSummary = `职业: ${treeData.career}, 总结: ${treeData.summary}`;

      const { system, user } = getChatSummaryPrompt({
        nodeId,
        nodeName: node.name,
        nodeDescription: node.description || '',
        conversationHistory,
        currentProgress: node.progress,
        difficulty: node.difficulty || 'beginner',
        treeSummary,
        isSummaryNode: nodeId === 'meta_growth'
      });

      const aiResult = await llmService.chatJSON(system, user, getCoachProvider());
      res.json(aiResult);
    } catch (error) {
      console.error('生成摘要失败:', error);
      res.status(500).json({ error: '生成摘要失败' });
    }
  },

  async getLearningSuggestions(req: Request, res: Response) {
    try {
      const { treeId, nodeId } = req.params;
      const pool = getDb();
      const ids = getAllowedUserIds(req);
      const treeResult = ids.length === 1
        ? await pool.query('SELECT * FROM trees WHERE id = $1 AND user_id = $2', [treeId, ids[0]])
        : await pool.query('SELECT * FROM trees WHERE id = $1 AND (user_id = $2 OR user_id = $3)', [treeId, ids[0], ids[1]]);
      const treeRow: any = treeResult.rows[0];
      if (!treeRow) return res.status(404).json({ error: '技能树不存在' });

      const treeData = JSON.parse(treeRow.tree_data);
      const node = treeData.nodes[nodeId];
      if (!node) return res.status(404).json({ error: '节点不存在' });

      const treeSummary = `职业: ${treeData.career}, 总结: ${treeData.summary}`;

      const nodeEntries = Object.entries(treeData.nodes) as [string, any][];
      const totalProgress = nodeEntries.reduce((sum: number, [, n]: [string, any]) => sum + (n.progress || 0), 0) / Math.max(nodeEntries.length, 1);
      const nodeProgressSummary = nodeEntries
        .filter(([, n]: [string, any]) => n.progress > 0)
        .map(([id, n]: [string, any]) => `${n.name}: ${n.progress}%`)
        .join(', ');

      const completedSkills = nodeEntries
        .filter(([, n]: [string, any]) => n.status === 'completed')
        .map(([, n]: [string, any]) => n.name);

      let recentConversationSummary = '';
      try {
        const historyResult = await pool.query(
          `SELECT role, content FROM chat_messages
           WHERE tree_id = $1 AND node_id = $2
           ORDER BY created_at DESC LIMIT 6`,
          [treeId, nodeId]
        );
        if (historyResult.rows.length > 0) {
          recentConversationSummary = historyResult.rows.map((h: any) => `${h.role === 'user' ? '用户' : 'AI'}: ${h.content}`).join('\n');
        }
      } catch {}

      const { system, user } = getLearningSuggestionPrompt({
        nodeId,
        nodeName: node.name,
        nodeDescription: node.description || '',
        currentProgress: node.progress,
        difficulty: node.difficulty || 'beginner',
        steps: node.steps?.map((s: any) => s.title),
        tools: node.tools?.map((t: any) => t.name),
        commonProblems: node.commonProblems?.map((p: any) => p.title),
        pitfalls: node.pitfalls?.map((p: any) => p.title),
        microMilestones: node.microMilestones,
        treeSummary,
        totalTreeProgress: totalProgress,
        nodeProgressSummary,
        userAbilities: completedSkills.join(', ') || undefined,
        recentConversationSummary: recentConversationSummary || undefined,
        isSummaryNode: nodeId === 'meta_growth'
      });

      const aiResult = await llmService.chatJSON(system, user, getCoachProvider());
      res.json(aiResult);
    } catch (error) {
      console.error('生成学习建议失败:', error);
      res.status(500).json({ error: '生成学习建议失败' });
    }
  }
};
