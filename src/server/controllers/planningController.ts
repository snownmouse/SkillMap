import { Request, Response } from 'express';
import { llmService } from '../llmService';
import { getPlanningPathsPrompt } from '../prompts/planningPaths';
import type { GenerateTreeRequest } from '../../types/backend';
import type { PlanPath, PlanPathOption, PlanStage } from '../../types/skillTree';
import { logger } from '../utils/logger';
import { errors } from '../middleware/errorHandler';

interface PlanningPathsResponseData {
  longTermGoal: string;
  stages: PlanStage[];
  paths: PlanPathOption[];
  recommendedPathId?: PlanPath;
  recommendedReason?: string;
}

function isPlanPath(value: unknown): value is PlanPath {
  return value === 'tech' ||
    value === 'management' ||
    value === 'slash' ||
    value === 'grassroot' ||
    value === 'national_strategy' ||
    value === 'startup' ||
    value === 'stable';
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => normalizeString(x)).filter(Boolean) as string[];
}

function normalizeStage(value: any): PlanStage | null {
  const id = normalizeString(value?.id);
  const title = normalizeString(value?.title);
  const objective = normalizeString(value?.objective);
  if (!id || !title || !objective) return null;
  const keyResults = normalizeStringArray(value?.keyResults ?? value?.key_results);
  const suggestedMonths = typeof value?.suggestedMonths === 'number'
    ? value.suggestedMonths
    : typeof value?.suggested_months === 'number'
      ? value.suggested_months
      : undefined;
  return {
    id,
    title,
    objective,
    keyResults,
    ...(typeof suggestedMonths === 'number' ? { suggestedMonths } : {}),
  };
}

function normalizePath(value: any): PlanPathOption | null {
  const id = value?.id;
  if (!isPlanPath(id)) return null;
  const name = normalizeString(value?.name);
  const description = normalizeString(value?.description);
  if (!name || !description) return null;
  const fitScore = typeof value?.fitScore === 'number'
    ? Math.max(0, Math.min(100, value.fitScore))
    : typeof value?.fit_score === 'number'
      ? Math.max(0, Math.min(100, value.fit_score))
      : undefined;
  const fitReason = normalizeString(value?.fitReason ?? value?.fit_reason);

  const stageRoadmapRaw = value?.stageRoadmap ?? value?.stage_roadmap;
  const stageRoadmap = Array.isArray(stageRoadmapRaw)
    ? stageRoadmapRaw
        .map((item: any) => {
          const stageId = normalizeString(item?.stageId ?? item?.stage_id);
          const route = normalizeStringArray(item?.route);
          const explanation = normalizeString(item?.explanation);
          if (!stageId || route.length === 0) return null;
          return {
            stageId,
            route,
            ...(explanation ? { explanation } : {})
          };
        })
        .filter(Boolean) as PlanPathOption['stageRoadmap']
    : undefined;

  return {
    id,
    name,
    description,
    ...(typeof fitScore === 'number' ? { fitScore } : {}),
    ...(fitReason ? { fitReason } : {}),
    ...(stageRoadmap ? { stageRoadmap } : {}),
  };
}

function normalizePlanningResponse(raw: any): PlanningPathsResponseData {
  const longTermGoal = normalizeString(raw?.longTermGoal ?? raw?.long_term_goal) || '长期目标';
  const stagesRaw = Array.isArray(raw?.stages) ? raw.stages : [];
  const stages = stagesRaw.map(normalizeStage).filter(Boolean) as PlanStage[];

  const pathsRaw = Array.isArray(raw?.paths) ? raw.paths : [];
  const paths = pathsRaw.map(normalizePath).filter(Boolean) as PlanPathOption[];

  const recommendedPathId = isPlanPath(raw?.recommendedPathId ?? raw?.recommended_path_id)
    ? (raw.recommendedPathId ?? raw.recommended_path_id)
    : undefined;
  const recommendedReason = normalizeString(raw?.recommendedReason ?? raw?.recommended_reason);

  if (stages.length < 2 || stages.length > 5) {
    throw errors.internal('AI 返回的阶段拆分不正确');
  }
  if (paths.length < 3 || paths.length > 5) {
    throw errors.internal('AI 返回的路径数量不正确');
  }

  return {
    longTermGoal,
    stages,
    paths,
    ...(recommendedPathId ? { recommendedPathId } : {}),
    ...(recommendedReason ? { recommendedReason } : {})
  };
}

export const planningController = {
  async getPaths(req: Request, res: Response) {
    try {
      const inputs: GenerateTreeRequest = req.body;
      if (!inputs.major || !inputs.career) {
        throw errors.validation('专业和目标职业是必填项');
      }

      logger.info('开始生成阶段拆分与路径候选', { career: inputs.career });

      const { system, user } = getPlanningPathsPrompt(inputs);
      const raw = await llmService.chatJSON(system, user);
      const data = normalizePlanningResponse(raw);

      res.json({
        success: true,
        data,
        meta: {
          generatedAt: new Date().toISOString(),
          theoryFramework: '中国特色生涯规划体系'
        }
      });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        res.status(appError.statusCode).json({ error: appError.userMessage });
        return;
      }
      logger.error('生成阶段拆分与路径候选失败', error);
      res.status(500).json({ error: '生成阶段拆分与路径候选失败，请稍后重试' });
    }
  }
};

