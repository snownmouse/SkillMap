import { Router } from 'express';
import { chatController } from '../controllers/chatController';

export const chatRouter = Router();

chatRouter.post('/', chatController.sendMessage);
chatRouter.get('/:nodeId', chatController.getHistory);
