import { cacheGetJson, cacheIncr, cacheSetJson } from './RedisService';
import type { GenerateTreeRequest, SkillTreeData } from '../../types/backend';

function safeKeyPart(s: string) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '_').slice(0, 80);
}

function buildKey(prefix: string, inputs: GenerateTreeRequest) {
  const major = safeKeyPart(inputs.major);
  const career = safeKeyPart(inputs.career);
  const level = safeKeyPart(inputs.level || 'unknown');
  const planMeta = (inputs as any).planMeta && typeof (inputs as any).planMeta === 'object' ? (inputs as any).planMeta : undefined;
  const planningKeyParts = planMeta
    ? [
        safeKeyPart((inputs as any).longTermGoal || planMeta.longTermGoal || ''),
        safeKeyPart(planMeta.selectedStageId || ''),
        safeKeyPart(planMeta.selectedPathId || '')
      ]
    : [];

  if (planningKeyParts.some(Boolean)) {
    return `skillmap:${prefix}:${major}:${career}:${level}:${planningKeyParts.map((p) => p || 'na').join(':')}`;
  }

  return `skillmap:${prefix}:${major}:${career}:${level}`;
}

export async function getCachedTree(inputs: GenerateTreeRequest): Promise<SkillTreeData | null> {
  const key = buildKey('tree_full', inputs);
  const data = await cacheGetJson<SkillTreeData>(key);
  await cacheIncr(data ? 'skillmap:cache:hit' : 'skillmap:cache:miss', 24 * 60 * 60);
  return data;
}

export async function setCachedTree(inputs: GenerateTreeRequest, tree: SkillTreeData): Promise<void> {
  const key = buildKey('tree_full', inputs);
  await cacheSetJson(key, tree, 7 * 24 * 60 * 60);
}

export async function getCachedSkeleton(inputs: GenerateTreeRequest): Promise<SkillTreeData | null> {
  const key = buildKey('tree_skeleton', inputs);
  const data = await cacheGetJson<SkillTreeData>(key);
  await cacheIncr(data ? 'skillmap:cache:hit' : 'skillmap:cache:miss', 24 * 60 * 60);
  return data;
}

export async function setCachedSkeleton(inputs: GenerateTreeRequest, tree: SkillTreeData): Promise<void> {
  const key = buildKey('tree_skeleton', inputs);
  await cacheSetJson(key, tree, 14 * 24 * 60 * 60);
}
