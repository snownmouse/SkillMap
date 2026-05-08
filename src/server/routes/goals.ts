import { Router } from 'express';
import { goalController } from '../controllers/goalController';
import { optionalAuth } from '../controllers/authController';
import { validateBody } from '../middleware/validation';

const planSchema = {
  treeId: { required: true, type: 'string' as const, minLength: 1, message: '技能树 ID 是必填项' },
  focusNodeIds: { type: 'string' as const },
  weeklyHours: { type: 'number' as const, min: 1, max: 80, message: '每周学习时间应在 1-80 小时之间' },
};

export const goalsRouter = Router();

goalsRouter.use(optionalAuth);
goalsRouter.post('/plan', validateBody(planSchema), goalController.plan);