import React from 'react';
import { useSkillTree } from '../hooks/useSkillTree';
import AppLayout from '../components/Layout/AppLayout';
import TimelineView from '../components/Timeline/TimelineView';

/**
 * 时间线页面
 */
const TimelinePage: React.FC = () => {
  const { skillTree } = useSkillTree();

  if (!skillTree) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <p className="text-dark-muted">尚未生成技能树</p>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-12 px-6">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-dark-text mb-4">成长历程</h1>
          <p className="text-dark-muted">记录你在 {skillTree.career} 道路上的每一个脚印</p>
        </div>

        <TimelineView events={skillTree.timeline} />
      </div>
    </AppLayout>
  );
};

export default TimelinePage;
