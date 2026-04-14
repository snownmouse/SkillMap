import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 首页
 */
const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-3xl space-y-12">
        {/* Logo/Title */}
        <div className="space-y-4">
          <div className="inline-block p-3 bg-skill-core/10 rounded-2xl border border-skill-core/20 mb-4">
            <span className="text-4xl">🗺️</span>
          </div>
          <h1 className="text-6xl font-black text-dark-text tracking-tight">
            Skill<span className="text-skill-core">Map</span>
          </h1>
          <p className="text-xl text-dark-muted">
            对话驱动的技能探索地图。AI 为你定制成长路径，陪你攻克每一个知识点。
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-dark-surface rounded-2xl border border-dark-border text-left">
            <div className="text-2xl mb-3">✨</div>
            <h3 className="font-bold text-dark-text mb-2">AI 定制</h3>
            <p className="text-sm text-dark-muted">根据你的背景和目标，生成个性化的技能树。</p>
          </div>
          <div className="p-6 bg-dark-surface rounded-2xl border border-dark-border text-left">
            <div className="text-2xl mb-3">💬</div>
            <h3 className="font-bold text-dark-text mb-2">对话复盘</h3>
            <p className="text-sm text-dark-muted">与 AI 导师交流学习心得，自动更新掌握进度。</p>
          </div>
          <div className="p-6 bg-dark-surface rounded-2xl border border-dark-border text-left">
            <div className="text-2xl mb-3">📈</div>
            <h3 className="font-bold text-dark-text mb-2">进度追踪</h3>
            <p className="text-sm text-dark-muted">可视化展示你的成长历程，见证每一个里程碑。</p>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-8">
          <Link 
            to="/generate"
            className="px-12 py-5 bg-skill-core text-white rounded-2xl font-black text-xl hover:bg-skill-core/80 transition-all shadow-xl shadow-skill-core/20 inline-block"
          >
            开启我的成长之路
          </Link>
          <p className="mt-4 text-dark-muted text-sm">无需注册，数据保存在本地</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
