import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, BrainCircuit, GitBranch, Radar, Sparkles, Target } from 'lucide-react';

/**
 * 首页
 */
const HomePage: React.FC = () => {
  return (
    <div className="app-shell px-4 py-6 md:px-6 flex items-center justify-center min-h-[calc(100vh-80px)]">
      <div className="app-container max-w-4xl w-full">
        <div className="page-hero text-center space-y-10">
          
          {/* 顶部标题区 */}
          <div className="space-y-6 flex flex-col items-center">
            <div className="section-kicker">
              <Sparkles size={14} />
              专属你的个人成长手账
            </div>

            <div className="space-y-5">
              <h1 className="text-5xl font-black tracking-tight text-app-text md:text-7xl">
                像游戏通关一样
                <br/>
                <span className="text-skill-core font-serif italic font-medium">探索未来</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg leading-8 text-app-muted md:text-xl">
                将模糊的职业规划拆解为一步步可推进的地图。记录每一次复盘，点亮每一段成长轨迹。
              </p>
            </div>
          </div>

          {/* 核心操作按钮 */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link 
              to="/generate"
              className="btn-primary inline-flex items-center justify-center rounded-2xl px-8 py-4 text-lg font-black transition-all shadow-xl shadow-skill-core/20"
            >
              开始生成我的 SkillMap
            </Link>
            <Link 
              to="/tree"
              className="btn-secondary inline-flex items-center justify-center rounded-2xl px-8 py-4 text-lg font-bold transition-all"
            >
              查看当前地图
            </Link>
          </div>

          {/* 底部三个小特点卡片 */}
          <div className="grid gap-4 text-left sm:grid-cols-3 mt-16 max-w-4xl mx-auto">
            <div className="panel-card-soft rounded-[24px] p-6 border border-[rgba(214,176,165,0.4)] text-center transition-transform hover:scale-[1.02]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-skill-core/10 text-skill-core">
                <Target size={24} />
              </div>
              <div className="text-lg font-bold text-app-text">聚焦目标</div>
              <div className="mt-2 text-sm text-app-muted leading-relaxed">从专业、职业与时间投入出发，收敛并生成最适合你的阶段性路径。</div>
            </div>
            
            <div className="panel-card-soft rounded-[24px] p-6 border border-[rgba(214,176,165,0.4)] text-center transition-transform hover:scale-[1.02]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-skill-specialization/10 text-skill-specialization">
                <Bot size={24} />
              </div>
              <div className="text-lg font-bold text-app-text">随时解惑</div>
              <div className="mt-2 text-sm text-app-muted leading-relaxed">针对每个知识节点进行对话，让你的进度变化和下一步建议都有据可依。</div>
            </div>
            
            <div className="panel-card-soft rounded-[24px] p-6 border border-[rgba(214,176,165,0.4)] text-center transition-transform hover:scale-[1.02]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-status-completed/10 text-status-completed">
                <Radar size={24} />
              </div>
              <div className="text-lg font-bold text-app-text">留存轨迹</div>
              <div className="mt-2 text-sm text-app-muted leading-relaxed">自动把你的学习行为和对话沉淀为成长时间线，随时复盘阶段成果。</div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default HomePage;
