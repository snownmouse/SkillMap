import { Request, Response } from 'express';
import { llmService } from '../llmService';
import { getCareerPlanPrompt } from '../prompts/careerPlan';
import { GenerateTreeRequest } from '../../types/backend';
import { logger } from '../utils/logger';
import { errors } from '../middleware/errorHandler';
import { createProviderFromConfig, isRequestConfigEffective } from '../utils/llmConfigFactory';

export interface Dimension {
  valueAlignment: number;
  practiceOrientation: number;
  socialContribution: number;
  developmentPotential: number;
  peopleOriented: number;
}

export interface CareerStep {
  career: string;
  description: string;
  duration: string;
  keySkills?: string[];
  successMetrics?: string;
  smartsGoal?: string;
  wisdomQuote?: string;
}

export interface CareerPath {
  id: string;
  name: string;
  description: string;
  fitHollandCode: string;
  fitCareerAnchor: string;
  fitReason: string;
  transferableSkills: string[];
  characteristics: {
    valueFit: string;
    practiceOpportunities: string;
    socialImpact: string;
    longTermPotential: string;
  };
  strategyAlignment?: string;
  practiceOpportunity?: string;
  steps: CareerStep[];
  fitScore: number;
  dimensionScore: Dimension;
}

export interface CareerPlanResponse {
  targetCareer: string;
  overallFit: {
    hollandCode: string;
    primaryAnchor: string;
    secondaryAnchor: string;
    dimension: Dimension;
  };
  paths: CareerPath[];
  recommendedPath: string;
  recommendedReason: string;
  alternativePaths: string[];
  wisdomQuote: string;
}

function validateCareerPlan(data: any): boolean {
  if (!data.targetCareer || typeof data.targetCareer !== 'string') return false;
  if (!data.overallFit || typeof data.overallFit !== 'object') return false;
  if (!Array.isArray(data.paths) || data.paths.length < 2 || data.paths.length > 5) return false;
  for (const path of data.paths) {
    if (!path.id || !path.name || !path.description) return false;
    if (!Array.isArray(path.steps) || path.steps.length < 2) return false;
    if (typeof path.fitScore !== 'number' || path.fitScore < 0 || path.fitScore > 100) return false;
    for (const step of path.steps) {
      if (!step.career || !step.description || !step.duration) return false;
    }
    if (!path.dimensionScore || typeof path.dimensionScore !== 'object') return false;
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
      const providerOverride = isRequestConfigEffective(req.llmConfig)
        ? createProviderFromConfig(req.llmConfig)
        : undefined;
      const planData: CareerPlanResponse = await llmService.chatJSON(system, user, providerOverride);

      if (!validateCareerPlan(planData)) {
        logger.warn('AI 返回的规划数据格式不完整，尝试修复', {
          hasTargetCareer: !!planData?.targetCareer,
          hasOverallFit: !!planData?.overallFit,
          pathsCount: Array.isArray(planData?.paths) ? planData.paths.length : 0
        });
        throw errors.internal('AI 返回的规划数据格式不正确');
      }

      planData.paths.sort((a, b) => b.fitScore - a.fitScore);

      const primaryPath = planData.paths.find(p => p.id === planData.recommendedPath) || planData.paths[0];

      logger.info('职业规划生成成功', {
        pathCount: planData.paths.length,
        recommendedPath: planData.recommendedPath,
        dimension: planData.overallFit.dimension
      });

      res.json({
        success: true,
        data: planData,
        meta: {
          generatedAt: new Date().toISOString(),
          theoryFramework: '生涯规划体系',
          wisdomQuote: planData.wisdomQuote,
          recommendedPathInfo: primaryPath ? {
            name: primaryPath.name,
            dimensionScore: primaryPath.dimensionScore,
            strategyAlignment: primaryPath.strategyAlignment,
            practiceOpportunity: primaryPath.practiceOpportunity
          } : null
        }
      });
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
