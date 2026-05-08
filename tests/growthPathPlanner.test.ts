import { describe, expect, test } from 'vitest';
import { generateGrowthPlan } from '../src/server/services/GrowthPathPlanner';
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
});

