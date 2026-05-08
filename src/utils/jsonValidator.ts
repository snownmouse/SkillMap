import {
  BloomLevel,
  CoachSnapshot,
  InsightCard,
  KolbPrompt,
  LearningStep,
  MasteryCriteria,
  MicroMilestone,
  PlanMeta,
  PlanPath,
  PlanPathOption,
  PlanStage,
  SkillTreeData,
  ToolRecommendation,
  UnlockThreshold,
} from '../types/skillTree';

/**
 * JSON 校验工具
 */
export function validateSkillTreeData(data: any): SkillTreeData {
  const defaultData: SkillTreeData = {
    version: '1.0',
    career: '未知职业',
    summary: '暂无简介',
    estimatedMonths: 6,
    overallObjective: '建立稳定、可持续推进的成长路径',
    overallKeyResults: [],
    generatedAt: new Date().toISOString(),
    planMeta: undefined,
    nodes: {},
    edges: [],
    categories: [],
    timeline: []
  };

  if (!data || typeof data !== 'object') return defaultData;

  // 基础字段校验与填充
  const validated: SkillTreeData = {
    version: data.version || defaultData.version,
    career: data.career || defaultData.career,
    summary: data.summary || defaultData.summary,
    estimatedMonths: typeof data.estimated_months === 'number'
      ? data.estimated_months
      : typeof data.estimatedMonths === 'number'
        ? data.estimatedMonths
        : defaultData.estimatedMonths,
    overallObjective: data.okr_overall?.objective || data.overallObjective || defaultData.overallObjective,
    overallKeyResults: Array.isArray(data.okr_overall?.keyResults)
      ? data.okr_overall.keyResults.filter(Boolean)
      : Array.isArray(data.overallKeyResults)
        ? data.overallKeyResults.filter(Boolean)
        : defaultData.overallKeyResults,
    generatedAt: data.generatedAt || defaultData.generatedAt,
    planMeta: normalizePlanMeta(data.planMeta ?? data.plan_meta),
    nodes: {},
    edges: Array.isArray(data.edges) ? data.edges : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    timeline: Array.isArray(data.timeline) ? data.timeline : []
  };

  // 节点校验
  if (data.nodes && typeof data.nodes === 'object') {
    Object.keys(data.nodes).forEach(id => {
      const node = data.nodes[id];
      validated.nodes[id] = {
        id: node.id || id,
        name: node.name || '未命名技能',
        description: node.description || '',
        whyItMatters: toOptionalString(node.whyItMatters),
        category: node.category || 'general',
        difficulty: node.difficulty || 'beginner',
        bloomLevel: normalizeBloomLevel(node.bloomLevel),
        status: normalizeNodeStatus(node.status),
        progress: typeof node.progress === 'number' ? Math.max(0, Math.min(100, node.progress)) : 0,
        dependencies: Array.isArray(node.dependencies) ? node.dependencies : [],
        relatedToExisting: toOptionalString(node.relatedToExisting),
        resources: Array.isArray(node.resources) ? node.resources : [],
        learningObjectives: normalizeStringArray(node.learningObjectives, node.objectives),
        deliverables: normalizeStringArray(node.deliverables),
        subSkills: Array.isArray(node.subSkills) ? node.subSkills : [],
        conversations: Array.isArray(node.conversations) ? node.conversations : [],
        aiPendingMessage: node.aiPendingMessage || null,
        practiceTips: toOptionalString(node.practiceTips),
        masteryCriteria: normalizeMasteryCriteria(node.masteryCriteria),
        unlockThreshold: normalizeUnlockThreshold(node.unlockThreshold),
        latestCoaching: normalizeCoachSnapshot(node.latestCoaching),
        lastActive: node.lastActive || null,
        milestone: node.milestone || '',
        estimatedHours: typeof node.estimatedHours === 'number' ? node.estimatedHours : 0,
        steps: normalizeSteps(node.steps),
        tools: normalizeTools(node.tools),
        commonProblems: normalizeInsightCards(node.commonProblems),
        pitfalls: normalizeInsightCards(node.pitfalls),
        microMilestones: normalizeMilestones(node.microMilestones),
        jdFrequency: typeof node.jdFrequency === 'number'
          ? node.jdFrequency
          : typeof node.jd_frequency === 'number'
            ? node.jd_frequency
            : undefined,
      };
    });
  }

  return validated;
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeStringArray(...sources: unknown[]): string[] {
  for (const source of sources) {
    if (Array.isArray(source)) {
      return source
        .map((item) => typeof item === 'string' ? item.trim() : '')
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeBloomLevel(value: unknown): BloomLevel | undefined {
  const allowed: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  return typeof value === 'string' && allowed.includes(value as BloomLevel) ? value as BloomLevel : undefined;
}

function normalizeNodeStatus(value: unknown): SkillTreeData['nodes'][string]['status'] {
  const allowed = new Set(['locked', 'available', 'in_progress', 'completed']);
  if (typeof value === 'string' && allowed.has(value)) return value as any;
  return 'locked';
}

function normalizePlanPath(value: unknown): PlanPath | undefined {
  const allowed: PlanPath[] = ['tech', 'management', 'slash', 'grassroot', 'national_strategy', 'startup', 'stable'];
  return typeof value === 'string' && allowed.includes(value as PlanPath) ? value as PlanPath : undefined;
}

function normalizePlanStage(value: unknown): PlanStage | null {
  if (!value || typeof value !== 'object') return null;
  const id = toOptionalString((value as any).id);
  const title = toOptionalString((value as any).title);
  const objective = toOptionalString((value as any).objective);
  const keyResults = normalizeStringArray((value as any).keyResults, (value as any).key_results);
  const suggestedMonths = typeof (value as any).suggestedMonths === 'number'
    ? (value as any).suggestedMonths
    : typeof (value as any).suggested_months === 'number'
      ? (value as any).suggested_months
      : undefined;
  if (!id || !title || !objective) return null;
  return {
    id,
    title,
    objective,
    keyResults,
    suggestedMonths,
  };
}

function normalizePlanPathOption(value: unknown): PlanPathOption | null {
  if (!value || typeof value !== 'object') return null;
  const id = normalizePlanPath((value as any).id);
  const name = toOptionalString((value as any).name);
  const description = toOptionalString((value as any).description);
  if (!id || !name || !description) return null;

  const stageRoadmapRaw = (value as any).stageRoadmap ?? (value as any).stage_roadmap;
  const stageRoadmap = Array.isArray(stageRoadmapRaw)
    ? stageRoadmapRaw
        .map((item: any) => {
          const stageId = toOptionalString(item?.stageId ?? item?.stage_id);
          const route = Array.isArray(item?.route) ? item.route.filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim()) : [];
          const explanation = toOptionalString(item?.explanation);
          if (!stageId || route.length === 0) return null;
          return { stageId, route, ...(explanation ? { explanation } : {}) };
        })
        .filter(Boolean) as PlanPathOption['stageRoadmap']
    : undefined;

  const fitScore = typeof (value as any).fitScore === 'number'
    ? (value as any).fitScore
    : typeof (value as any).fit_score === 'number'
      ? (value as any).fit_score
      : undefined;
  const fitReason = toOptionalString((value as any).fitReason ?? (value as any).fit_reason);

  return {
    id,
    name,
    description,
    ...(stageRoadmap ? { stageRoadmap } : {}),
    ...(typeof fitScore === 'number' ? { fitScore: Math.max(0, Math.min(100, fitScore)) } : {}),
    ...(fitReason ? { fitReason } : {}),
  };
}

function normalizePlanMeta(value: unknown): PlanMeta | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const longTermGoal = toOptionalString((value as any).longTermGoal ?? (value as any).long_term_goal);
  const selectedStageId = toOptionalString((value as any).selectedStageId ?? (value as any).selected_stage_id);
  const selectedPathId = normalizePlanPath((value as any).selectedPathId ?? (value as any).selected_path_id);

  const stagesRaw = (value as any).stages;
  const stages = Array.isArray(stagesRaw)
    ? stagesRaw.map(normalizePlanStage).filter(Boolean) as PlanStage[]
    : undefined;

  const pathsRaw = (value as any).paths;
  const paths = Array.isArray(pathsRaw)
    ? pathsRaw.map(normalizePlanPathOption).filter(Boolean) as PlanPathOption[]
    : undefined;

  if (!longTermGoal && !selectedStageId && !selectedPathId && (!stages || stages.length === 0) && (!paths || paths.length === 0)) {
    return undefined;
  }

  return {
    ...(longTermGoal ? { longTermGoal } : {}),
    ...(stages && stages.length > 0 ? { stages } : {}),
    ...(selectedStageId ? { selectedStageId } : {}),
    ...(paths && paths.length > 0 ? { paths } : {}),
    ...(selectedPathId ? { selectedPathId } : {}),
  };
}

function normalizeUnlockThreshold(value: unknown): UnlockThreshold | undefined {
  const allowed: UnlockThreshold[] = ['minimum', 'proficient', 'mastery'];
  return typeof value === 'string' && allowed.includes(value as UnlockThreshold) ? value as UnlockThreshold : undefined;
}

function normalizeMasteryCriteria(value: any): MasteryCriteria | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const minimum = toOptionalString(value.minimum);
  const proficient = toOptionalString(value.proficient);
  const mastery = toOptionalString(value.mastery);
  if (!minimum && !proficient && !mastery) return undefined;
  return {
    minimum: minimum || '达到基础掌握水平',
    proficient: proficient || minimum || '能独立完成常见任务',
    mastery: mastery || proficient || minimum || '能稳定迁移到复杂场景',
  };
}

function normalizeSteps(value: unknown): LearningStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { title: item, description: item };
      }
      if (!item || typeof item !== 'object') return null;
      const title = toOptionalString((item as any).title) || toOptionalString((item as any).name);
      const description = toOptionalString((item as any).description) || toOptionalString((item as any).detail);
      const output = toOptionalString((item as any).output);
      if (!title && !description) return null;
      return {
        title: title || '学习步骤',
        description: description || title || '完成该阶段练习',
        output,
      };
    })
    .filter(Boolean) as LearningStep[];
}

function normalizeTools(value: unknown): ToolRecommendation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { name: item, purpose: '辅助完成当前节点练习' };
      }
      if (!item || typeof item !== 'object') return null;
      const name = toOptionalString((item as any).name);
      const purpose = toOptionalString((item as any).purpose) || toOptionalString((item as any).description);
      if (!name && !purpose) return null;
      return {
        name: name || '辅助工具',
        purpose: purpose || '帮助推进当前节点',
      };
    })
    .filter(Boolean) as ToolRecommendation[];
}

function normalizeInsightCards(value: unknown): InsightCard[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { title: item, detail: item };
      }
      if (!item || typeof item !== 'object') return null;
      const title = toOptionalString((item as any).title) || toOptionalString((item as any).name);
      const detail = toOptionalString((item as any).detail) || toOptionalString((item as any).description);
      if (!title && !detail) return null;
      return {
        title: title || '关键提醒',
        detail: detail || title || '需要特别留意的内容',
      };
    })
    .filter(Boolean) as InsightCard[];
}

function normalizeMilestones(value: unknown): MicroMilestone[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { title: item, outcome: item };
      }
      if (!item || typeof item !== 'object') return null;
      const title = toOptionalString((item as any).title) || toOptionalString((item as any).name);
      const outcome = toOptionalString((item as any).outcome) || toOptionalString((item as any).description);
      if (!title && !outcome) return null;
      return {
        title: title || '阶段里程碑',
        outcome: outcome || title || '出现可见进展',
      };
    })
    .filter(Boolean) as MicroMilestone[];
}

function normalizeCoachSnapshot(value: any): CoachSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const bloomAssessment = normalizeBloomAssessment(value.bloomAssessment);
  const kolbPrompt = normalizeKolbPrompt(value.kolbPrompt);
  const deliberatePracticeTip = toOptionalString(value.deliberatePracticeTip);
  const nextChallenge = toOptionalString(value.nextChallenge);
  const growthMindsetPhrase = toOptionalString(value.growthMindsetPhrase);
  const nextHook = toOptionalString(value.nextHook);
  const summary = toOptionalString(value.summary);
  const updatedAt = toOptionalString(value.updatedAt);
  if (!bloomAssessment && !kolbPrompt && !deliberatePracticeTip && !nextChallenge && !growthMindsetPhrase && !nextHook && !summary) {
    return null;
  }
  return {
    bloomAssessment,
    kolbPrompt,
    deliberatePracticeTip,
    nextChallenge,
    growthMindsetPhrase,
    nextHook,
    summary,
    updatedAt,
  };
}

function normalizeBloomAssessment(value: any) {
  if (!value || typeof value !== 'object') return undefined;
  const currentLevel = normalizeBloomLevel(value.currentLevel);
  const evidence = toOptionalString(value.evidence);
  const confidence = value.confidence === 'high' || value.confidence === 'medium' || value.confidence === 'low'
    ? value.confidence
    : undefined;
  if (!currentLevel && !evidence && !confidence) return undefined;
  return {
    currentLevel: currentLevel || 'understand',
    evidence: evidence || '基于最近一次对话进行判断',
    confidence: confidence || 'medium',
  };
}

function normalizeKolbPrompt(value: any): KolbPrompt | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const stage = value.stage === 'concrete' || value.stage === 'reflective' || value.stage === 'abstract' || value.stage === 'active'
    ? value.stage
    : undefined;
  const question = toOptionalString(value.question);
  if (!stage && !question) return undefined;
  return {
    stage: stage || 'reflective',
    question: question || '回看这次练习，你最想调整的地方是什么？',
  };
}
