import type { SkillTreeData } from '../../types/skillTree';
import { CAREER_PATHS, getPathById, calculateFitScore } from '../prompts/theoryFramework';

export type PlanPath = 'tech' | 'management' | 'slash' | 'grassroot' | 'national_strategy' | 'startup' | 'stable';

export interface ChineseDimension {
  jiaGuoQingHuai: number;
  yiLiJianGu: number;
  mingDeHongDao: number;
  shiJianZhiXiang: number;
}

export interface CareerFitScore {
  hollandMatch: number;
  careerAnchorMatch: number;
  nationalDemand: number;
  socialContribution: number;
  culturalHeritage: number;
  grassrootWillingness: number;
  chineseDimension: ChineseDimension;
  finalScore: number;
}

export interface Dimension {
  valueAlignment: number;
  practiceOrientation: number;
  socialContribution: number;
  developmentPotential: number;
  peopleOriented: number;
}

export interface PrunedNode {
  nodeId: string;
  reason: string;
  recoverWhen: string;
}

export interface MilestoneTask {
  nodeId: string;
  title: string;
  estimatedHours: number;
  deliverables: string[];
}

export interface MilestonePlan {
  id: 'B' | 'C' | 'D' | 'A';
  title: string;
  targetWeeks: number;
  tasks: MilestoneTask[];
  includedNodeIds: string[];
}

export interface GrowthPlan {
  path: PlanPath;
  maxNodes: number;
  includedNodeIds: string[];
  prunedNodes: PrunedNode[];
  milestones: MilestonePlan[];
  stats: {
    totalNodes: number;
    totalHours: number;
    weeklyHours: number;
    estimatedDays: number;
  };
  dimension?: Dimension;
  chineseDimension?: ChineseDimension;
  fitScore?: number;
}

export interface PlanOptions {
  path: PlanPath;
  maxNodes: number;
  weeklyHours: number;
  goalNodeId?: string;
  priorityAdjustments?: Record<string, number>;
  dimensionScores?: Record<string, number>;
}

const PATH_WEIGHTS: Record<PlanPath, { core?: number; specialization?: number; general?: number; grassroot?: number }> = {
  tech: { core: 0.8, specialization: 1.0, general: 1.1 },
  management: { core: 0.9, specialization: 1.0, general: 0.85 },
  slash: { core: 0.85, specialization: 0.95, general: 1.0 },
  grassroot: { core: 1.0, specialization: 0.9, general: 0.75, grassroot: 1.2 },
  national_strategy: { core: 1.1, specialization: 1.05, general: 0.9, grassroot: 1.1 },
  startup: { core: 0.9, specialization: 1.1, general: 1.0, grassroot: 0.95 },
  stable: { core: 0.85, specialization: 0.9, general: 1.1 }
};

const CHINESE_DIMENSION_DEFAULTS: Record<PlanPath, ChineseDimension> = {
  tech: { jiaGuoQingHuai: 60, yiLiJianGu: 70, mingDeHongDao: 75, shiJianZhiXiang: 65 },
  management: { jiaGuoQingHuai: 75, yiLiJianGu: 80, mingDeHongDao: 85, shiJianZhiXiang: 70 },
  slash: { jiaGuoQingHuai: 70, yiLiJianGu: 75, mingDeHongDao: 75, shiJianZhiXiang: 75 },
  grassroot: { jiaGuoQingHuai: 95, yiLiJianGu: 90, mingDeHongDao: 85, shiJianZhiXiang: 100 },
  national_strategy: { jiaGuoQingHuai: 90, yiLiJianGu: 85, mingDeHongDao: 80, shiJianZhiXiang: 85 },
  startup: { jiaGuoQingHuai: 75, yiLiJianGu: 70, mingDeHongDao: 70, shiJianZhiXiang: 80 },
  stable: { jiaGuoQingHuai: 65, yiLiJianGu: 75, mingDeHongDao: 80, shiJianZhiXiang: 60 }
};

const DIMENSION_WEIGHTS: Record<PlanPath, Dimension> = {
  tech: { valueAlignment: 70, practiceOrientation: 65, socialContribution: 60, developmentPotential: 80, peopleOriented: 65 },
  management: { valueAlignment: 75, practiceOrientation: 60, socialContribution: 70, developmentPotential: 75, peopleOriented: 75 },
  slash: { valueAlignment: 75, practiceOrientation: 70, socialContribution: 70, developmentPotential: 75, peopleOriented: 75 },
  grassroot: { valueAlignment: 85, practiceOrientation: 100, socialContribution: 90, developmentPotential: 65, peopleOriented: 95 },
  national_strategy: { valueAlignment: 90, practiceOrientation: 85, socialContribution: 95, developmentPotential: 90, peopleOriented: 85 },
  startup: { valueAlignment: 85, practiceOrientation: 75, socialContribution: 80, developmentPotential: 95, peopleOriented: 70 },
  stable: { valueAlignment: 60, practiceOrientation: 55, socialContribution: 50, developmentPotential: 55, peopleOriented: 100 }
};

function nodeWeight(path: PlanPath, estimatedHours: number, category: string, difficulty: string) {
  const base = Math.max(1, estimatedHours || 1);
  const catW = category === 'core' ? 0.8 : category === 'specialization' ? 1.0 : 1.1;
  const diffW = difficulty === 'advanced' ? 1.2 : difficulty === 'intermediate' ? 1.0 : 0.9;
  const pathW = PATH_WEIGHTS[path];
  const grassrootBonus = path === 'grassroot' && category === 'general' ? 0.75 : 1.0;
  return base * catW * diffW * (pathW?.[category as keyof typeof pathW] || 1.0) * grassrootBonus;
}

function buildPrereqGraph(tree: SkillTreeData) {
  const prereqs = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  for (const [id, node] of Object.entries(tree.nodes)) {
    const deps = Array.isArray(node.dependencies) ? node.dependencies : [];
    prereqs.set(id, new Set(deps));
    for (const dep of deps) {
      if (!dependents.has(dep)) dependents.set(dep, new Set());
      dependents.get(dep)!.add(id);
    }
  }

  return { prereqs, dependents };
}

function closurePrereqs(startIds: string[], prereqs: Map<string, Set<string>>): Set<string> {
  const out = new Set<string>();
  const stack = [...startIds];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    const deps = prereqs.get(id);
    if (!deps) continue;
    for (const d of deps) {
      if (!out.has(d)) stack.push(d);
    }
  }
  return out;
}

function pickGoalNode(tree: SkillTreeData, requested?: string): string | null {
  if (requested && tree.nodes[requested]) return requested;
  const nodes = Object.values(tree.nodes);

  const strategyKeywords = ['ai', '人工智能', '芯片', '半导体', '新能源', '智能制造', '云计算', '大数据'];
  const practiceKeywords = ['基础', '基层', '应用', '实践', '项目', '工程'];

  if (tree.career) {
    const careerLower = tree.career.toLowerCase();
    const hasStrategy = strategyKeywords.some(k => careerLower.includes(k));
    const hasPractice = practiceKeywords.some(k => careerLower.includes(k));

    if (hasStrategy || hasPractice) {
      const preferred = nodes.filter(n => n.category === 'specialization' || n.category === 'core');
      const byHours = (a: any, b: any) => (b.estimatedHours || 0) - (a.estimatedHours || 0);
      const pick = preferred.sort(byHours)[0];
      return pick?.id || null;
    }
  }

  const preferred = nodes.filter(n => n.category === 'specialization');
  const byHours = (a: any, b: any) => (b.estimatedHours || 0) - (a.estimatedHours || 0);
  const pick = (preferred.length ? preferred : nodes).sort(byHours)[0];
  return pick?.id || null;
}

function topoSortSubset(nodeIds: string[], prereqs: Map<string, Set<string>>): string[] {
  const set = new Set(nodeIds);
  const inDeg = new Map<string, number>();
  const outEdges = new Map<string, Set<string>>();

  for (const id of set) {
    const deps = prereqs.get(id) || new Set<string>();
    let d = 0;
    for (const dep of deps) {
      if (!set.has(dep)) continue;
      d++;
      if (!outEdges.has(dep)) outEdges.set(dep, new Set());
      outEdges.get(dep)!.add(id);
    }
    inDeg.set(id, d);
  }

  const q: string[] = [];
  for (const [id, d] of inDeg) if (d === 0) q.push(id);

  const out: string[] = [];
  while (q.length) {
    const id = q.shift()!;
    out.push(id);
    const next = outEdges.get(id);
    if (!next) continue;
    for (const v of next) {
      const nd = (inDeg.get(v) || 0) - 1;
      inDeg.set(v, nd);
      if (nd === 0) q.push(v);
    }
  }

  for (const id of set) if (!out.includes(id)) out.push(id);
  return out;
}

function scoreNodeForPrune(tree: SkillTreeData, id: string, path: PlanPath) {
  const n = tree.nodes[id];
  const base = nodeWeight(path, n?.estimatedHours || 1, n?.category || 'general', n?.difficulty || 'beginner');
  const catBonus = n?.category === 'core' ? 3 : n?.category === 'specialization' ? 2 : 1;
  const statusBonus = n?.status === 'completed' ? 3 : n?.status === 'in_progress' ? 2 : 1;
  return base / (catBonus * statusBonus);
}

export function generateGrowthPlan(tree: SkillTreeData, opts: PlanOptions): GrowthPlan {
  const goalNodeId = pickGoalNode(tree, opts.goalNodeId);
  const { prereqs } = buildPrereqGraph(tree);
  const allNodeIds = Object.keys(tree.nodes);
  const requestedMax = Math.max(1, opts.maxNodes || 60);
  const weeklyHours = Math.max(1, opts.weeklyHours || 10);

  if (!goalNodeId) {
    return {
      path: opts.path,
      maxNodes: requestedMax,
      includedNodeIds: [],
      prunedNodes: [],
      milestones: [],
      stats: { totalNodes: 0, totalHours: 0, weeklyHours, estimatedDays: 0 },
      chineseDimension: CHINESE_DIMENSION_DEFAULTS[opts.path],
      fitScore: opts.dimensionScores ? calculateFitScore(opts.path, opts.dimensionScores) : undefined
    };
  }

  const baseSet = closurePrereqs([goalNodeId], prereqs);
  const included = new Set<string>(baseSet);

  const priority = opts.priorityAdjustments || {};
  const ordered = topoSortSubset(Array.from(included), prereqs).sort((a, b) => (priority[b] || 0) - (priority[a] || 0));

  if (ordered.length > requestedMax) {
    const prunable = ordered.filter(id => id !== goalNodeId && (tree.nodes[id]?.category || 'general') !== 'core');
    const keep = new Set<string>(ordered);
    const sortedPrunable = prunable
      .map(id => ({ id, s: scoreNodeForPrune(tree, id, opts.path) }))
      .sort((a, b) => b.s - a.s);

    for (const item of sortedPrunable) {
      if (keep.size <= requestedMax) break;
      keep.delete(item.id);
    }
    included.clear();
    for (const id of keep) included.add(id);
  }

  const finalOrder = topoSortSubset(Array.from(included), prereqs);
  const totalHours = finalOrder.reduce((sum, id) => sum + (tree.nodes[id]?.estimatedHours || 1), 0);
  const estimatedWeeks = Math.ceil(totalHours / weeklyHours);
  const estimatedDays = estimatedWeeks * 7;

  const milestoneIds: Array<'B' | 'C' | 'D' | 'A'> = ['B', 'C', 'D', 'A'];
  const chunks: string[][] = [[], [], [], []];
  const perMilestoneLimit = 15;

  const targetNodes = Math.max(1, finalOrder.length);
  for (let i = 0; i < targetNodes; i++) {
    const mIndex = Math.min(3, Math.floor((i / targetNodes) * 4));
    chunks[mIndex].push(finalOrder[i]);
  }

  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].length <= perMilestoneLimit) continue;
    const overflow = chunks[i].splice(perMilestoneLimit);
    for (const id of overflow) {
      const next = Math.min(3, i + 1);
      chunks[next].push(id);
    }
  }

  const milestones: MilestonePlan[] = milestoneIds.map((id, idx) => {
    const nodeIds = chunks[idx];
    const tasks = nodeIds.slice(0, perMilestoneLimit).map((nodeId) => {
      const n: any = tree.nodes[nodeId];
      return {
        nodeId,
        title: n?.name || nodeId,
        estimatedHours: Math.max(1, n?.estimatedHours || 1),
        deliverables: Array.isArray(n?.deliverables) ? n.deliverables : []
      };
    });
    const hours = tasks.reduce((s, t) => s + t.estimatedHours, 0);
    const targetWeeks = Math.max(1, Math.min(4, Math.ceil(hours / weeklyHours)));
    return {
      id,
      title: id === 'A' ? '目标达成' : `里程碑 ${id}`,
      targetWeeks,
      tasks,
      includedNodeIds: nodeIds
    };
  });

  const prunedNodes: PrunedNode[] = allNodeIds
    .filter(id => !included.has(id))
    .map(id => {
      const n: any = tree.nodes[id];
      const reason = ordered.length > requestedMax ? '不在最短可行路径或非关键依赖，已暂缓' : '当前计划未包含';
      const recoverWhen = n?.category === 'core' ? '当你切换到更完整路径时自动恢复' : '完成当前里程碑且每周投入提高后可恢复';
      return { nodeId: id, reason, recoverWhen };
    });

  const dimension = DIMENSION_WEIGHTS[opts.path];
  const chineseDimension = CHINESE_DIMENSION_DEFAULTS[opts.path];
  const fitScore = opts.dimensionScores ? calculateFitScore(opts.path, opts.dimensionScores) : undefined;

  return {
    path: opts.path,
    maxNodes: requestedMax,
    includedNodeIds: finalOrder,
    prunedNodes,
    milestones,
    stats: {
      totalNodes: finalOrder.length,
      totalHours,
      weeklyHours,
      estimatedDays
    },
    dimension,
    chineseDimension,
    fitScore
  };
}

export function getDimensionDescription(dimension: Dimension): string {
  const parts: string[] = [];

  if (dimension.valueAlignment >= 80) {
    parts.push('价值契合：与个人价值观高度匹配');
  } else if (dimension.valueAlignment >= 60) {
    parts.push('价值导向：关注个人发展与价值观的结合');
  }

  if (dimension.practiceOrientation >= 80) {
    parts.push('实践导向：注重实践锻炼、知行合一');
  } else if (dimension.practiceOrientation >= 60) {
    parts.push('实践精神：强调理论联系实际');
  }

  if (dimension.socialContribution >= 80) {
    parts.push('社会贡献：服务社会发展、贡献公共价值');
  } else if (dimension.socialContribution >= 60) {
    parts.push('社会责任：关注对社会的积极影响');
  }

  if (dimension.developmentPotential >= 80) {
    parts.push('发展潜力：长期发展空间广阔');
  } else if (dimension.developmentPotential >= 60) {
    parts.push('成长空间：具有良好的发展前景');
  }

  if (dimension.peopleOriented >= 80) {
    parts.push('以人为本：关注民生需求、服务人民');
  }

  return parts.length > 0 ? parts.join('；') : '综合发展';
}

export function getChineseDimensionDescription(chineseDimension: ChineseDimension): string {
  const parts: string[] = [];

  if (chineseDimension.jiaGuoQingHuai >= 80) {
    parts.push('家国情怀深厚：积极响应国家号召');
  } else if (chineseDimension.jiaGuoQingHuai >= 60) {
    parts.push('家国情怀：关注国家发展需求');
  }

  if (chineseDimension.yiLiJianGu >= 80) {
    parts.push('义利兼顾：重视社会责任与个人发展统一');
  } else if (chineseDimension.yiLiJianGu >= 60) {
    parts.push('注重平衡：兼顾个人利益与社会责任');
  }

  if (chineseDimension.mingDeHongDao >= 80) {
    parts.push('明德弘道：追求高尚的职业道德');
  } else if (chineseDimension.mingDeHongDao >= 60) {
    parts.push('注重修养：重视职业道德建设');
  }

  if (chineseDimension.shiJianZhiXiang >= 80) {
    parts.push('实践志向明确：积极投身基层实践');
  } else if (chineseDimension.shiJianZhiXiang >= 60) {
    parts.push('实践导向：注重理论联系实际');
  }

  return parts.length > 0 ? parts.join('；') : '全面发展';
}

export function getCareerPaths() {
  return CAREER_PATHS;
}