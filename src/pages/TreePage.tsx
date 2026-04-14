import React from 'react';
import { useSkillTree } from '../hooks/useSkillTree';
import SkillTreeCanvas from '../components/SkillTree/SkillTreeCanvas';
import SkillNodeDetail from '../components/SkillTree/SkillNodeDetail';
import AppLayout from '../components/Layout/AppLayout';

/**
 * 技能树主页面
 */
const TreePage: React.FC = () => {
  const { skillTree, activeNode, setActiveNode } = useSkillTree();

  if (!skillTree) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-dark-muted">尚未生成技能树</p>
          <a href="/generate" className="text-skill-core font-bold hover:underline">去生成 →</a>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden">
        {/* 画布 */}
        <SkillTreeCanvas 
          data={skillTree} 
          onNodeClick={(id) => setActiveNode(id)} 
        />

        {/* 详情面板 */}
        {activeNode && (
          <SkillNodeDetail 
            node={activeNode} 
            onClose={() => setActiveNode(null)} 
          />
        )}

        {/* 悬浮统计 */}
        <div className="absolute bottom-6 left-6 p-4 bg-dark-surface/80 backdrop-blur border border-dark-border rounded-2xl pointer-events-none">
          <div className="text-xs text-dark-muted uppercase tracking-widest mb-1">当前职业</div>
          <div className="text-lg font-bold text-dark-text">{skillTree.career}</div>
          <div className="mt-3 flex items-center space-x-4">
            <div>
              <div className="text-[10px] text-dark-muted uppercase">总进度</div>
              <div className="text-skill-core font-mono font-bold">12%</div>
            </div>
            <div className="w-px h-6 bg-dark-border" />
            <div>
              <div className="text-[10px] text-dark-muted uppercase">已解锁</div>
              <div className="text-status-completed font-mono font-bold">5/24</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default TreePage;
