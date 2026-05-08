import { Router } from 'express';
import { planningController } from '../controllers/planningController';
import { llmRateLimiter } from '../middleware/llmRateLimit';
import { validateBody } from '../middleware/validation';

const planningSchema = {
  major: { required: true, type: 'string' as const, minLength: 1, maxLength: 200, message: '专业是必填项' },
  career: { required: true, type: 'string' as const, minLength: 1, maxLength: 200, message: '目标职业是必填项' },
  level: { required: true, type: 'string' as const, message: '当前水平是必填项' },
  weeklyHours: { type: 'number' as const, min: 1, max: 80, message: '每周投入时间应在 1-80 小时之间' },
  notes: { type: 'string' as const, maxLength: 2000 },
  existingSkills: { type: 'array' as const },
  longTermGoal: { type: 'string' as const, maxLength: 300 }
};

export const planningRouter = Router();

planningRouter.post('/paths', llmRateLimiter, validateBody(planningSchema), planningController.getPaths);

