import { Request, Response } from 'express';
import { llmService } from '../llmService';
import { getCareerPlanPrompt } from '../prompts/careerPlan';
import { GenerateTreeRequest, CareerPlanResponse } from '../../types/backend';
import { logger, errors } from '../utils/Logger';

function validateCareerPlan(data: any): boolean {
  if (!data.targetCareer || typeof data.targetCareer !== 'string') return false;
  if (!Array.isArray(data.paths) || data.paths.length < 2 || data.paths.length > 4) return false;
  for (const path of data.paths) {
    if (!path.id || !path.name || !path.description) return false;
    if (!Array.isArray(path.steps) || path.steps.length < 2) return false;
    if (typeof path.fitScore !== 'number' || path.fitScore < 0 || path.fitScore > 100) return false;
    for (const step of path.steps) {
      if (!step.career || !step.description || !step.duration) return false;
    }
  }
  return true;
}

export const careerController = {
  async plan(req: Request, res: Response) {
    try {
      const inputs: GenerateTreeRequest = req.body;
      if (!inputs.major || !inputs.career) {
        throw errors.validation('专业和目标职业是必填项');
      }

      logger.info('开始生成职业规划', { major: inputs.major, career: inputs.career });

      const { system, user } = getCareerPlanPrompt(inputs);
      const planData: CareerPlanResponse = await llmService.chatJSON(system, user, 'career_plan', validateCareerPlan);

      planData.paths.sort((a, b) => b.fitScore - a.fitScore);

      logger.info('职业规划生成成功', { pathCount: planData.paths.length });
      res.json(planData);
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('生成职业规划失败', error);
      res.status(500).json({ error: '生成职业规划失败，请稍后重试' });
    }
  }
};
