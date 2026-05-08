import { Router } from 'express';
import { treeController } from '../controllers/treeController';
import { optionalAuth } from '../controllers/authController';
import { llmRateLimiter } from '../middleware/llmRateLimit';
import { validateBody } from '../middleware/validation';

const generateSchema = {
  major: { required: true, type: 'string' as const, minLength: 1, message: '专业是必填项' },
  career: { required: true, type: 'string' as const, minLength: 1, maxLength: 200, message: '目标职业是必填项' },
  level: { required: true, type: 'string' as const },
  weeklyHours: { type: 'number' as const, min: 1, max: 80, message: '每周学习时间应在 1-80 小时之间' },
};

export const treeRouter = Router();

treeRouter.use(optionalAuth);

treeRouter.post('/generate', llmRateLimiter, validateBody(generateSchema), treeController.generate);
treeRouter.get('/task/:taskId', treeController.getTaskStatus);
treeRouter.get('/', treeController.list);
treeRouter.post('/import', treeController.import);
treeRouter.post('/:id/export', treeController.export);
treeRouter.post('/:id/export-json', treeController.exportJSON);
treeRouter.get('/:id', treeController.getById);
treeRouter.put('/:id', treeController.update);
treeRouter.delete('/:id', treeController.delete);
