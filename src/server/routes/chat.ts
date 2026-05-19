import { Router } from 'express';
import { chatController } from '../controllers/chatController';

export const chatRouter = Router({ mergeParams: true });

chatRouter.post('/', chatController.sendMessage);
chatRouter.get('/:nodeId', chatController.getHistory);
chatRouter.get('/:nodeId/summary', chatController.getSummary);
chatRouter.get('/:nodeId/suggestions', chatController.getLearningSuggestions);
