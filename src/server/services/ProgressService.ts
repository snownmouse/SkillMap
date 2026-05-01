import { TreeRepository } from '../repositories';
import { TimelineService } from './TimelineService';

interface ProgressUpdate {
  nodeId: string;
  newProgress: number;
  confidence: string;
  reason: string;
}

interface SemanticProgressResult {
  estimatedProgress: number;
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
  bloomLevel?: string;
  microMilestonesCompleted?: string[];
}

export class ProgressService {
  private timelineService: TimelineService | null = null;

  constructor(private treeRepo: TreeRepository) {}

  setTimelineService(timelineService: TimelineService) {
    this.timelineService = timelineService;
  }

  async updateProgress(treeId: string, nodeId: string, progressUpdate: any) {
    if (!progressUpdate) {
      return;
    }

    const treeData = await this.treeRepo.getTreeData(treeId);
    if (!treeData) {
      return;
    }
    if (!treeData.nodes) {
      return;
    }
    if (!treeData.nodes[nodeId]) {
      return;
    }

    const currentProgress = treeData.nodes[nodeId].progress || 0;
    const newProgress = Math.min(100, Math.max(0, progressUpdate.new_progress || progressUpdate.newProgress));
    const confidence = progressUpdate.confidence || 'medium';

    const finalProgress = this.applyProgressiveUpdate(currentProgress, newProgress, confidence);
    treeData.nodes[nodeId].progress = finalProgress;

    if (finalProgress === 100) {
      treeData.nodes[nodeId].status = 'completed';
    } else if (finalProgress > 0) {
      treeData.nodes[nodeId].status = 'in_progress';
    }

    const unlockedNodeIds = this.updateDependentNodes(treeData, nodeId);

    await this.treeRepo.updateTreeData(treeId, treeData);

    if (this.timelineService && finalProgress !== currentProgress) {
      await this.timelineService.addProgressEvent(treeId, nodeId, currentProgress, finalProgress);
    }

    if (this.timelineService && unlockedNodeIds.length > 0) {
      for (const unlockedId of unlockedNodeIds) {
        await this.timelineService.addUnlockEvent(treeId, unlockedId);
      }
    }
  }

  async updateProgressFromSemantic(treeId: string, nodeId: string, semanticResult: SemanticProgressResult) {
    const treeData = await this.treeRepo.getTreeData(treeId);
    if (!treeData || !treeData.nodes[nodeId]) return;

    const currentProgress = treeData.nodes[nodeId].progress || 0;
    const estimatedProgress = Math.min(100, Math.max(0, semanticResult.estimatedProgress));

    const finalProgress = this.applySemanticProgressUpdate(
      currentProgress,
      estimatedProgress,
      semanticResult.confidence
    );

    treeData.nodes[nodeId].progress = finalProgress;

    if (finalProgress === 100) {
      treeData.nodes[nodeId].status = 'completed';
    } else if (finalProgress > 0) {
      treeData.nodes[nodeId].status = 'in_progress';
    }

    if (semanticResult.microMilestonesCompleted && treeData.nodes[nodeId].microMilestones) {
      for (const milestoneName of semanticResult.microMilestonesCompleted) {
        const milestone = treeData.nodes[nodeId].microMilestones.find(
          (m: any) => m.name === milestoneName
        );
        if (milestone) {
          milestone.completed = true;
        }
      }
    }

    this.updateDependentNodes(treeData, nodeId);

    await this.treeRepo.updateTreeData(treeId, treeData);

    if (this.timelineService && finalProgress !== currentProgress) {
      await this.timelineService.addProgressEvent(treeId, nodeId, currentProgress, finalProgress);
    }

    return {
      previousProgress: currentProgress,
      newProgress: finalProgress,
      confidence: semanticResult.confidence,
      evidence: semanticResult.evidence,
    };
  }

  private updateDependentNodes(treeData: any, completedNodeId: string): string[] {
    const completedNode = treeData.nodes[completedNodeId];
    if (!completedNode || completedNode.status !== 'completed') return [];

    const unlockedNodeIds: string[] = [];

    for (const [nodeId, node] of Object.entries(treeData.nodes) as [string, any][]) {
      if (nodeId === completedNodeId) continue;
      if (node.status !== 'locked') continue;
      if (!node.dependencies || node.dependencies.length === 0) continue;

      const allDepsCompleted = node.dependencies.every((depId: string) => {
        const depNode = treeData.nodes[depId];
        return depNode && (depNode.status === 'completed' || depNode.progress >= 80);
      });

      if (allDepsCompleted) {
        node.status = 'available';
        unlockedNodeIds.push(nodeId);
      }
    }

    return unlockedNodeIds;
  }

  private applyProgressiveUpdate(current: number, newProgress: number, confidence: string): number {
    const maxIncrement = confidence === 'high' ? 15 : confidence === 'medium' ? 10 : 5;

    if (newProgress <= current) {
      return newProgress;
    }

    const increment = newProgress - current;
    if (increment <= maxIncrement) {
      return newProgress;
    }

    if (current > 50) {
      return Math.min(current + 10, newProgress);
    } else if (current > 30) {
      return Math.min(current + 15, newProgress);
    } else {
      return Math.min(current + maxIncrement, newProgress);
    }
  }

  private applySemanticProgressUpdate(
    current: number,
    estimated: number,
    confidence: 'high' | 'medium' | 'low'
  ): number {
    const confidenceWeight = confidence === 'high' ? 0.8 : confidence === 'medium' ? 0.5 : 0.3;

    if (estimated > current) {
      const maxIncrement = confidence === 'high' ? 20 : confidence === 'medium' ? 15 : 8;
      const weightedIncrement = (estimated - current) * confidenceWeight;
      const finalIncrement = Math.min(weightedIncrement, maxIncrement);
      return Math.round(Math.min(100, current + finalIncrement));
    } else if (estimated < current) {
      const maxDecrement = confidence === 'high' ? 10 : confidence === 'medium' ? 5 : 2;
      const weightedDecrement = (current - estimated) * confidenceWeight * 0.5;
      const finalDecrement = Math.min(weightedDecrement, maxDecrement);
      return Math.round(Math.max(0, current - finalDecrement));
    }

    return current;
  }

  async getProgressStats(treeId: string) {
    const treeData = await this.treeRepo.getTreeData(treeId);
    if (!treeData) return null;

    const nodes = Object.values(treeData.nodes) as any[];
    const nonMetaNodes = nodes.filter(n => n.category !== 'meta');

    const totalNodes = nonMetaNodes.length;
    const completedNodes = nonMetaNodes.filter(n => n.status === 'completed').length;
    const inProgressNodes = nonMetaNodes.filter(n => n.status === 'in_progress').length;
    const availableNodes = nonMetaNodes.filter(n => n.status === 'available').length;
    const lockedNodes = nonMetaNodes.filter(n => n.status === 'locked').length;

    const overallProgress = totalNodes > 0
      ? Math.round(nonMetaNodes.reduce((sum, n) => sum + (n.progress || 0), 0) / totalNodes)
      : 0;

    const categoryStats: Record<string, any> = {};
    for (const category of treeData.categories || []) {
      if (category.id === 'meta') continue;
      const catNodes = nonMetaNodes.filter(n => n.category === category.id);
      if (catNodes.length === 0) continue;

      categoryStats[category.id] = {
        name: category.name,
        color: category.color,
        totalNodes: catNodes.length,
        completedNodes: catNodes.filter(n => n.status === 'completed').length,
        averageProgress: Math.round(
          catNodes.reduce((sum, n) => sum + (n.progress || 0), 0) / catNodes.length
        ),
      };
    }

    const streakDays = this.calculateStreak(treeData.timeline || []);

    return {
      totalNodes,
      completedNodes,
      inProgressNodes,
      availableNodes,
      lockedNodes,
      overallProgress,
      categoryStats,
      streakDays,
      completionRate: totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0,
    };
  }

  private calculateStreak(timeline: any[]): number {
    if (!timeline || timeline.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activityDates = new Set<string>();
    for (const event of timeline) {
      const date = new Date(event.date).toISOString().split('T')[0];
      activityDates.add(date);
    }

    let streak = 0;
    const checkDate = new Date(today);

    if (!activityDates.has(checkDate.toISOString().split('T')[0])) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (activityDates.has(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }
}
