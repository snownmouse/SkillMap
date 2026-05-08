import { v4 as uuidv4 } from 'uuid';
import { ChatMessageRepository } from '../repositories';
import { messageBufferService } from './MessageBufferService';
import { logger } from '../utils/logger';

export class ChatMessageService {
  constructor(private messageRepo: ChatMessageRepository) {}

  async saveChatMessages(treeId: string, nodeId: string, userMessage: string, aiResult: any) {
    const userMsgId = uuidv4();
    const aiMsgId = uuidv4();
    const messages = [
      {
        id: userMsgId,
        treeId,
        nodeId,
        role: 'user',
        content: userMessage,
        metadata: null
      },
      {
        id: aiMsgId,
        treeId,
        nodeId,
        role: 'assistant',
        content: aiResult.reply,
        metadata: JSON.stringify(aiResult)
      }
    ];

    logger.info('[Chat] 消息入队等待写入', { 
      treeId, 
      nodeId, 
      queueLength: messageBufferService.getQueueLength() 
    });

    return await messageBufferService.enqueue(async () => {
      logger.debug('[Chat] 开始写入消息到数据库', { treeId, nodeId });
      await this.messageRepo.saveMessages(messages);
      logger.debug('[Chat] 消息写入完成', { treeId, nodeId });
    });
  }

  async getHistory(treeId: string, nodeId: string, limit = 50, offset = 0) {
    const messages = await this.messageRepo.getMessagesByNode(treeId, nodeId, limit, offset);
    const total = await this.messageRepo.getMessageCount(treeId, nodeId);

    return {
      messages: messages.map((r: any) => ({
        ...r,
        metadata: r.metadata ? JSON.parse(r.metadata) : null
      })),
      total,
      limit,
      offset,
    };
  }

  async getConversationHistory(treeId: string, nodeId: string, limit = 20): Promise<string> {
    return await this.messageRepo.getConversationHistory(treeId, nodeId, limit);
  }

  async searchMessages(treeId: string, query: string, limit = 20) {
    return await this.messageRepo.searchMessages(treeId, query, limit);
  }

  async getConversationSummary(treeId: string) {
    return await this.messageRepo.getConversationSummary(treeId);
  }
}
