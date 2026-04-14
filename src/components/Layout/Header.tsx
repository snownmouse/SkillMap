import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, User } from 'lucide-react';
import SettingsModal from './SettingsModal';

/**
 * 顶部导航栏
 */
const Header: React.FC = () => {
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const navItems = [
    { name: '技能树', path: '/tree', icon: '🗺️' },
    { name: '时间线', path: '/tree/timeline', icon: '📈' },
  ];

  return (
    <header className="h-16 bg-dark-surface border-b border-dark-border px-6 flex items-center justify-between z-40">
      <div className="flex items-center space-x-8">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl">🗺️</span>
          <span className="text-xl font-black text-dark-text tracking-tighter">SkillMap</span>
        </Link>

        <nav className="flex space-x-1">
          {navItems.map(item => (
            <Link 
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${
                location.pathname === item.path 
                  ? 'bg-skill-core/10 text-skill-core' 
                  : 'text-dark-muted hover:text-dark-text hover:bg-dark-bg'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-dark-muted hover:text-dark-text transition-colors"
        >
          <Settings size={20} />
        </button>
        <div className="w-8 h-8 rounded-full bg-skill-core/20 border border-skill-core/40 flex items-center justify-center text-xs font-bold text-skill-core cursor-pointer hover:bg-skill-core/30 transition-colors">
          <User size={16} />
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  );
};

export default Header;
