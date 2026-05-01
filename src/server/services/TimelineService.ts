import { TreeRepository } from '../repositories';

type TimelineEventType = 'progress' | 'conversation' | 'unlock' | 'insight' | 'milestone' | 'achievement' | 'streak';

interface TimelineEvent {
  id: string;
  date: string;
  type: TimelineEventType;
  title: string;
  summary: string;
  nodeId?: string;
  nodeName?: string;
  details?: Record<string, unknown>;
}

interface TimelineFilter {
  type?: TimelineEventType;
  nodeId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

interface TimelineStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  streakDays: number;
  longestStreak: number;
  totalConversations: number;
  totalMilestones: number;
  recentActivity: { date: string; count: number }[];
}

const MILESTONE_THRESHOLDS = [25, 50, 75, 100];

export class TimelineService {
  constructor(private treeRepo: TreeRepository) {}

  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  async addTimelineEvent(treeId: string, nodeId: string, timelineEvent: any) {
    if (!timelineEvent) return;

    const treeData = await this.treeRepo.getTreeData(treeId);
    if (!treeData) return;

    treeData.timeline = treeData.timeline || [];

    const nodeName = treeData.nodes?.[nodeId]?.name;

    const event: TimelineEvent = {
      id: timelineEvent.id || this.generateId(),
      date: timelineEvent.date || new Date().toISOString(),
      type: timelineEvent.type || 'conversation',
      title: timelineEvent.title || timelineEvent.summary || '',
      summary: timelineEvent.summary || '',
      nodeId: timelineEvent.nodeId || nodeId,
      nodeName: timelineEvent.nodeName || nodeName,
      details: timelineEvent.details,
    };

    treeData.timeline.unshift(event);

    await this.treeRepo.updateTreeData(treeId, treeData);

    return event;
  }

  async addProgressEvent(treeId: string, nodeId: string, previousProgress: number, newProgress: number) {
    const treeData = await this.treeRepo.getTreeData(treeId);
    if (!treeData) return;

    const node = treeData.nodes?.[nodeId];
    if (!node) return;

    const nodeName = node.name || nodeId;

    if (newProgress >= 100 && previousProgress < 100) {
      await this.addTimelineEvent(treeId, nodeId, {
        type: 'milestone',
        title: `完成技能: ${nodeName}`,
        summary: `恭喜！你已完成「${nodeName}」的学习，进度达到100%`,
        nodeId,
        nodeName,
        details: { previousProgress, newProgress: 100 },
      });
      return;
    }

    for (const threshold of MILESTONE_THRESHOLDS) {
      if (newProgress >= threshold && previousProgress < threshold) {
        await this.addTimelineEvent(treeId, nodeId, {
          type: 'progress',
          title: `${nodeName} 进度达到 ${threshold}%`,
          summary: `「${nodeName}」的学习进度已达到 ${threshold}%`,
          nodeId,
          nodeName,
          details: { previousProgress, newProgress, threshold },
        });
        return;
      }
    }
  }

  async addUnlockEvent(treeId: string, nodeId: string) {
    const treeData = await this.treeRepo.getTreeData(treeId);
    if (!treeData) return;

    const node = treeData.nodes?.[nodeId];
    if (!node) return;

    const nodeName = node.name || nodeId;

    await this.addTimelineEvent(treeId, nodeId, {
      type: 'unlock',
      title: `解锁新技能: ${nodeName}`,
      summary: `新技能「${nodeName}」已解锁，可以开始学习了！`,
      nodeId,
      nodeName,
    });
  }

  async addStreakEvent(treeId: string, streakDays: number) {
    const treeData = await this.treeRepo.getTreeData(treeId);
    if (!treeData) return;

    const streakMilestones = [3, 7, 14, 30, 60, 100];
    if (!streakMilestones.includes(streakDays)) return;

    const existingStreakEvents = (treeData.timeline || []).filter(
      (e: any) => e.type === 'streak' && (e.details as any)?.streakDays === streakDays
    );
    if (existingStreakEvents.length > 0) return;

    await this.addTimelineEvent(treeId, 'meta_growth', {
      type: 'streak',
      title: `连续学习 ${streakDays} 天！`,
      summary: `太棒了！你已经连续学习 ${streakDays} 天，坚持就是胜利！`,
      nodeId: 'meta_growth',
      nodeName: '全局成长',
      details: { streakDays },
    });
  }

  async getTimeline(treeId: string, filter?: TimelineFilter): Promise<{ events: TimelineEvent[]; total: number }> {
    const treeData = await this.treeRepo.getTreeData(treeId);
    if (!treeData) return { events: [], total: 0 };

    let events: TimelineEvent[] = treeData.timeline || [];

    if (filter?.type) {
      events = events.filter(e => e.type === filter.type);
    }
    if (filter?.nodeId) {
      events = events.filter(e => e.nodeId === filter.nodeId);
    }
    if (filter?.startDate) {
      events = events.filter(e => new Date(e.date) >= new Date(filter.startDate!));
    }
    if (filter?.endDate) {
      events = events.filter(e => new Date(e.date) <= new Date(filter.endDate!));
    }

    const total = events.length;

    if (filter?.offset !== undefined) {
      events = events.slice(filter.offset);
    }
    if (filter?.limit !== undefined) {
      events = events.slice(0, filter.limit);
    }

    return { events, total };
  }

  async getTimelineStats(treeId: string): Promise<TimelineStats> {
    const treeData = await this.treeRepo.getTreeData(treeId);
    if (!treeData) {
      return {
        totalEvents: 0,
        eventsByType: {},
        streakDays: 0,
        longestStreak: 0,
        totalConversations: 0,
        totalMilestones: 0,
        recentActivity: [],
      };
    }

    const events: TimelineEvent[] = treeData.timeline || [];

    const eventsByType: Record<string, number> = {};
    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    }

    const streakDays = this.calculateStreak(events);
    const longestStreak = this.calculateLongestStreak(events);

    const totalConversations = eventsByType['conversation'] || 0;
    const totalMilestones = (eventsByType['milestone'] || 0) + (eventsByType['achievement'] || 0);

    const recentActivity = this.calculateRecentActivity(events);

    return {
      totalEvents: events.length,
      eventsByType,
      streakDays,
      longestStreak,
      totalConversations,
      totalMilestones,
      recentActivity,
    };
  }

  private calculateStreak(events: TimelineEvent[]): number {
    if (!events || events.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activityDates = new Set<string>();
    for (const event of events) {
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

  private calculateLongestStreak(events: TimelineEvent[]): number {
    if (!events || events.length === 0) return 0;

    const dates = [...new Set(
      events.map(e => new Date(e.date).toISOString().split('T')[0])
    )].sort();

    if (dates.length === 0) return 0;

    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }

    return longestStreak;
  }

  private calculateRecentActivity(events: TimelineEvent[]): { date: string; count: number }[] {
    const activityMap: Record<string, number> = {};

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const event of events) {
      const eventDate = new Date(event.date);
      if (eventDate >= thirtyDaysAgo) {
        const dateKey = eventDate.toISOString().split('T')[0];
        activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
      }
    }

    return Object.entries(activityMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
