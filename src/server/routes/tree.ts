import { Router } from 'express';
import { treeController } from '../controllers/treeController';

export const treeRouter = Router();

treeRouter.post('/generate', treeController.generate);
treeRouter.get('/task/:taskId', treeController.getTaskStatus);
treeRouter.get('/', treeController.list);
treeRouter.get('/:id', treeController.getById);
treeRouter.put('/:id', treeController.update);
treeRouter.delete('/:id', treeController.delete);
