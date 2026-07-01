import { Request, Response } from 'express';
import { llmService } from '../llmService';
import { getPlanningPathsPrompt } from '../prompts/planningPaths';
import type { GenerateTreeRequest } from '../../types/backend';
import type { PlanPath, PlanPathOption, PlanStage } from '../../types/skillTree';
import { logger } from '../utils/logger';
import { createProviderFromConfig, isRequestConfigEffective } from '../utils/llmConfigFactory';

interface PlanningPathsResponseData {
  longTermGoal: string;
  stages: PlanStage[];
  paths: PlanPathOption[];
  recommendedPathId?: PlanPath;
  recommendedReason?: string;
}

const VALID_PATH_IDS: PlanPath[] = ['tech', 'management', 'slash', 'grassroot', 'national_strategy', 'startup', 'stable'];

const PATH_ID_ALIASES: Record<string, PlanPath> = {
  'technology': 'tech',
  'technical': 'tech',
  'tech_deep': 'tech',
  'tech_specialist': 'tech',
  'mgr': 'management',
  'manager': 'management',
  'leader': 'management',
  'leadership': 'management',
  'hybrid': 'slash',
  'cross': 'slash',
  'cross_domain': 'slash',
  'interdisciplinary': 'slash',
  'composite': 'slash',
  'grassroots': 'grassroot',
  'grass_root': 'grassroot',
  'community': 'grassroot',
  'rural': 'grassroot',
  'national': 'national_strategy',
  'nation': 'national_strategy',
  'strategy': 'national_strategy',
  'country': 'national_strategy',
  'innovation': 'startup',
  'entrepreneurship': 'startup',
  'entrepreneur': 'startup',
  'venture': 'startup',
  'stability': 'stable',
  'steady': 'stable',
  'conservative': 'stable',
  'civil_service': 'stable',
  'public_service': 'stable',
};

function resolvePathId(raw: unknown): PlanPath | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const normalized = raw.trim().toLowerCase().replace(/[-\s]/g, '_');
  if (VALID_PATH_IDS.includes(normalized as PlanPath)) return normalized as PlanPath;
  const alias = PATH_ID_ALIASES[normalized];
  if (alias) return alias;
  for (const validId of VALID_PATH_IDS) {
    if (normalized.includes(validId) || validId.includes(normalized)) return validId;
  }
  return null;
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
  const resolvedId = resolvePathId(value?.id);
  if (!resolvedId) return null;
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
    id: resolvedId,
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

  const seenIds = new Set<PlanPath>();
  const uniquePaths = paths.filter(p => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  const recommendedPathId = resolvePathId(raw?.recommendedPathId ?? raw?.recommended_path_id);
  const recommendedReason = normalizeString(raw?.recommendedReason ?? raw?.recommended_reason);

  return {
    longTermGoal,
    stages,
    paths: uniquePaths,
    ...(recommendedPathId ? { recommendedPathId } : {}),
    ...(recommendedReason ? { recommendedReason } : {})
  };
}

export const planningController = {
  async getPaths(req: Request, res: Response) {
    try {
      const inputs: GenerateTreeRequest = req.body;
      if (!inputs.major || !inputs.career) {
        return res.status(400).json({ error: '专业和目标职业是必填项' });
      }

      logger.info('开始生成阶段拆分与路径候选', { career: inputs.career });

      let data: PlanningPathsResponseData | null = null;
      let lastError: Error | null = null;
      const maxAttempts = 2;
      const providerOverride = isRequestConfigEffective(req.llmConfig)
        ? createProviderFromConfig(req.llmConfig)
        : undefined;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const { system, user } = getPlanningPathsPrompt(inputs);
          const raw = await llmService.chatJSON(system, user, providerOverride);
          logger.info('规划路径API返回原始数据', { attempt, rawType: typeof raw, hasPaths: Array.isArray(raw?.paths), hasStages: Array.isArray(raw?.stages) });
          const normalized = normalizePlanningResponse(raw);

          if (normalized.stages.length >= 2 && normalized.paths.length >= 2) {
            data = normalized;
            break;
          }

          lastError = new Error(`AI返回数据不完整：${normalized.stages.length}个阶段, ${normalized.paths.length}条路径（需要至少2个阶段和2条路径）`);
          logger.warn('规划路径数据不完整，准备重试', { attempt, stages: normalized.stages.length, paths: normalized.paths.length });
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          logger.warn('规划路径调用失败', { attempt, error: lastError.message });
        }
      }

      if (!data) {
        logger.error('生成阶段拆分与路径候选最终失败', { error: lastError?.message });
        return res.status(500).json({ error: lastError?.message || '生成路径建议失败，请稍后重试' });
      }

      res.json({
        success: true,
        data,
        meta: {
          generatedAt: new Date().toISOString(),
          theoryFramework: '中国特色生涯规划体系'
        }
      });
    } catch (error) {
      logger.error('生成阶段拆分与路径候选异常', error);
      res.status(500).json({ error: '生成路径建议失败，请稍后重试' });
    }
  }
};
