import { Request, Response } from 'express';
import { llmService } from '../llmService';
import { getCareerPlanPrompt } from '../prompts/careerPlan';
import { GenerateTreeRequest } from '../../types/backend';
import { logger } from '../utils/logger';

export const careerPlanController = {
  async analyze(req: Request, res: Response) {
    try {
      const inputs: GenerateTreeRequest = req.body;
      
      if (!inputs.major || !inputs.career || typeof inputs.career !== 'string' || inputs.career.trim() === '') {
        return res.status(400).json({ error: '专业和目标职业是必填项' });
      }

      logger.info('收到职业规划分析请求', { inputs });

      const { system, user } = getCareerPlanPrompt(inputs);
      const result = await llmService.chatJSON(system, user);

      res.json({
        success: true,
        data: result,
        inputs
      });
    } catch (error) {
      logger.error('职业规划分析失败', error);
      res.status(500).json({ error: error instanceof Error ? error.message : '分析失败' });
    }
  }
};