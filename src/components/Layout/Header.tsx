import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GitBranch, Radar, Settings, Sparkles, User, PartyPopper } from 'lucide-react';
import SettingsModal from './SettingsModal';
import { useSkillTree } from '../../hooks/useSkillTree';
import { useAppContext } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';

/**
 * 顶部导航栏
 */
const Header: React.FC = () => {
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { skillTree } = useSkillTree();
  const { state } = useAppContext();
  const { theme, toggleTheme } = useTheme();
  const currentTreePath = skillTree?.id ? `/tree/${skillTree.id}` : '/tree';
  const currentTimelinePath = skillTree?.id ? `/tree/${skillTree.id}/timeline` : '/tree/timeline';

  const navItems = [
    { name: '技能树', path: currentTreePath, isActive: location.pathname === '/tree' || /^\/tree\/[^/]+$/.test(location.pathname), icon: GitBranch },
    { name: '时间线', path: currentTimelinePath, isActive: location.pathname === '/tree/timeline' || /^\/tree\/[^/]+\/timeline$/.test(location.pathname), icon: Radar },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-app-border bg-app-surface/72 backdrop-blur-xl">
      <div className="app-container flex min-h-16 items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 items-center gap-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-skill-core/25 bg-skill-core/10 text-skill-core">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-app-text">栖舟寻志</div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-app-muted">AI Career Atlas</div>
            </div>
          </Link>

          <nav className="hidden rounded-2xl border border-[rgba(214,176,165,0.4)] bg-[rgba(255,250,240,0.8)] p-1 sm:flex">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link 
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    item.isActive
                      ? 'bg-skill-core/15 text-skill-core shadow-sm' 
                      : 'text-app-muted hover:bg-[rgba(232,159,110,0.05)] hover:text-skill-core'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={toggleTheme}
            className="hidden rounded-xl border border-skill-core/20 bg-skill-core/10 px-3 py-2 text-sm font-bold text-skill-core transition-all hover:bg-skill-core/20 hover:scale-105 active:scale-95 sm:inline-flex items-center gap-2"
            title={theme === 'default' ? '切换到六一主题' : '切换到默认主题'}
          >
            <PartyPopper size={16} />
            <span className="hidden lg:inline">{theme === 'default' ? '六一' : '原版'}</span>
          </button>
          <Link
            to="/generate"
            className="hidden rounded-xl border border-skill-core/20 bg-skill-core/10 px-4 py-2 text-sm font-bold text-skill-core transition-all hover:bg-skill-core/20 hover:scale-105 active:scale-95 md:inline-flex"
          >
            继续规划
          </Link>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(214,176,165,0.4)] bg-[rgba(255,250,240,0.8)] text-app-muted transition-all hover:text-skill-core hover:bg-[rgba(232,159,110,0.05)] hover:rotate-90"
          >
            <Settings size={20} />
          </button>
          <Link
            to={state.auth?.token ? '/tree' : '/login'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-skill-core/25 bg-skill-core/10 text-skill-core transition-colors hover:bg-skill-core/15"
          >
            <User size={16} />
          </Link>
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  );
};

export default Header;
