import { describe, expect, test } from 'vitest';
import { generateGrowthPlan, getChineseDimensionDescription, getCareerPaths } from '../src/server/services/GrowthPathPlanner';
import { calculateFitScore } from '../src/server/prompts/theoryFramework';
import type { SkillTreeData } from '../src/types/skillTree';

function makeTree(nodeCount: number): SkillTreeData {
  const nodes: any = {};
  const edges: any[] = [];
  for (let i = 1; i <= nodeCount; i++) {
    const id = `n${i}`;
    nodes[id] = {
      id,
      name: `N${i}`,
      description: '',
      category: i % 10 === 0 ? 'specialization' : (i % 3 === 0 ? 'general' : 'core'),
      difficulty: i % 7 === 0 ? 'advanced' : (i % 2 === 0 ? 'intermediate' : 'beginner'),
      status: 'locked',
      progress: 0,
      dependencies: i === 1 ? [] : [`n${i - 1}`],
      resources: [],
      learningObjectives: [],
      deliverables: [],
      subSkills: [],
      conversations: [],
      aiPendingMessage: null,
      lastActive: null,
      milestone: '',
      estimatedHours: (i % 5) + 1
    };
    if (i > 1) edges.push({ from: `n${i - 1}`, to: id, type: 'prerequisite' });
  }

  return {
    version: '1.0',
    career: 'demo',
    summary: 'demo',
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    categories: [],
    timeline: []
  };
}

describe('generateGrowthPlan', () => {
  test('returns empty when no nodes', () => {
    const tree: SkillTreeData = {
      version: '1.0',
      career: 'demo',
      summary: '',
      generatedAt: new Date().toISOString(),
      nodes: {},
      edges: [],
      categories: [],
      timeline: []
    };
    const plan = generateGrowthPlan(tree, { path: 'tech', maxNodes: 60, weeklyHours: 10 });
    expect(plan.includedNodeIds.length).toBe(0);
    expect(plan.milestones.length).toBe(0);
    expect(plan.chineseDimension).toBeDefined();
  });

  test('honors maxNodes', () => {
    const tree = makeTree(80);
    const plan = generateGrowthPlan(tree, { path: 'tech', maxNodes: 20, weeklyHours: 10 });
    expect(plan.includedNodeIds.length).toBeLessThanOrEqual(20);
  });

  test('milestones are always four', () => {
    const tree = makeTree(30);
    const plan = generateGrowthPlan(tree, { path: 'tech', maxNodes: 60, weeklyHours: 10 });
    expect(plan.milestones.map(m => m.id)).toEqual(['B', 'C', 'D', 'A']);
  });

  test.each(Array.from({ length: 50 }, (_, i) => i + 10))('fast planning for %s nodes', (n) => {
    const tree = makeTree(n);
    const plan = generateGrowthPlan(tree, { path: 'slash', maxNodes: 60, weeklyHours: 8 });
    expect(plan.stats.totalNodes).toBeGreaterThanOrEqual(1);
    expect(plan.stats.totalHours).toBeGreaterThanOrEqual(plan.stats.totalNodes);
    expect(plan.stats.estimatedDays).toBeGreaterThanOrEqual(7);
  });

  test('includes chineseDimension for all paths', () => {
    const tree = makeTree(20);
    const paths: Array<'tech' | 'management' | 'grassroot' | 'national_strategy' | 'startup' | 'stable'> = 
      ['tech', 'management', 'grassroot', 'national_strategy', 'startup', 'stable'];
    
    for (const path of paths) {
      const plan = generateGrowthPlan(tree, { path, maxNodes: 60, weeklyHours: 10 });
      expect(plan.chineseDimension).toBeDefined();
      expect(plan.chineseDimension?.jiaGuoQingHuai).toBeDefined();
      expect(plan.chineseDimension?.yiLiJianGu).toBeDefined();
      expect(plan.chineseDimension?.mingDeHongDao).toBeDefined();
      expect(plan.chineseDimension?.shiJianZhiXiang).toBeDefined();
    }
  });

  test('grassroot path has highest practice orientation', () => {
    const tree = makeTree(20);
    const plan = generateGrowthPlan(tree, { path: 'grassroot', maxNodes: 60, weeklyHours: 10 });
    expect(plan.chineseDimension?.shiJianZhiXiang).toBe(100);
    expect(plan.chineseDimension?.jiaGuoQingHuai).toBe(95);
  });

  test('national_strategy path has highest national demand alignment', () => {
    const tree = makeTree(20);
    const plan = generateGrowthPlan(tree, { path: 'national_strategy', maxNodes: 60, weeklyHours: 10 });
    expect(plan.chineseDimension?.jiaGuoQingHuai).toBe(90);
    expect(plan.chineseDimension?.shiJianZhiXiang).toBe(85);
  });

  test('calculates fitScore when dimensionScores provided', () => {
    const tree = makeTree(20);
    const dimensionScores = {
      holland_match: 80,
      career_anchor_match: 75,
      jia_guo_qing_huai: 85,
      yi_li_jian_gu: 80,
      ming_de_hong_dao: 75,
      shi_jian_zhi_xiang: 90,
      national_demand: 88,
      social_contribution: 82
    };
    const plan = generateGrowthPlan(tree, { 
      path: 'grassroot', 
      maxNodes: 60, 
      weeklyHours: 10,
      dimensionScores 
    });
    expect(plan.fitScore).toBeDefined();
    expect(plan.fitScore).toBeGreaterThan(0);
  });
});

describe('getChineseDimensionDescription', () => {
  test('returns description for high scores', () => {
    const dimension = {
      jiaGuoQingHuai: 90,
      yiLiJianGu: 85,
      mingDeHongDao: 80,
      shiJianZhiXiang: 95
    };
    const desc = getChineseDimensionDescription(dimension);
    expect(desc).toContain('家国情怀深厚');
    expect(desc).toContain('义利兼顾');
    expect(desc).toContain('明德弘道');
    expect(desc).toContain('实践志向明确');
  });

  test('returns description for medium scores', () => {
    const dimension = {
      jiaGuoQingHuai: 65,
      yiLiJianGu: 60,
      mingDeHongDao: 70,
      shiJianZhiXiang: 55
    };
    const desc = getChineseDimensionDescription(dimension);
    expect(desc).toContain('家国情怀');
    expect(desc).toContain('注重平衡');
    expect(desc).toContain('注重修养');
  });

  test('returns comprehensive for all high', () => {
    const dimension = {
      jiaGuoQingHuai: 100,
      yiLiJianGu: 100,
      mingDeHongDao: 100,
      shiJianZhiXiang: 100
    };
    const desc = getChineseDimensionDescription(dimension);
    expect(desc).toContain('家国情怀深厚');
    expect(desc).toContain('义利兼顾');
    expect(desc).toContain('明德弘道');
    expect(desc).toContain('实践志向明确');
  });
});

describe('calculateFitScore', () => {
  test('calculates score correctly for tech path', () => {
    const scores = {
      holland_match: 80,
      career_anchor_match: 75,
      jia_guo_qing_huai: 60,
      yi_li_jian_gu: 70,
      ming_de_hong_dao: 75,
      shi_jian_zhi_xiang: 65,
      national_demand: 70,
      social_contribution: 60
    };
    const score = calculateFitScore('tech', scores);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('grassroot path weights practice orientation higher', () => {
    const scores = {
      holland_match: 50,
      career_anchor_match: 50,
      jia_guo_qing_huai: 95,
      yi_li_jian_gu: 90,
      ming_de_hong_dao: 85,
      shi_jian_zhi_xiang: 100,
      national_demand: 85,
      social_contribution: 95
    };
    const score = calculateFitScore('grassroot', scores);
    expect(score).toBeGreaterThan(80);
  });
});

describe('getCareerPaths', () => {
  test('returns all career paths', () => {
    const paths = getCareerPaths();
    expect(paths.length).toBe(7);
    const pathIds = paths.map(p => p.id);
    expect(pathIds).toContain('tech');
    expect(pathIds).toContain('management');
    expect(pathIds).toContain('grassroot');
    expect(pathIds).toContain('national_strategy');
  });

  test('each path has dimension weights', () => {
    const paths = getCareerPaths();
    for (const path of paths) {
      expect(path.dimensionWeights).toBeDefined();
      expect(Object.keys(path.dimensionWeights).length).toBe(8);
    }
  });
});