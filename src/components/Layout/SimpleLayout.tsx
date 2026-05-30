import React from 'react';
import Header from './Header';

/**
 * 通用布局组件 - 用于首页、登录页等不需要复杂布局的页面
 */
const SimpleLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-shell flex flex-col text-app-text">
      <Header />
      <main className="flex-1 relative">
        {children}
      </main>
    </div>
  );
};

export default SimpleLayout;
