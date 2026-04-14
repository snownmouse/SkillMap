import React from 'react';
import Header from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * 整体布局组件
 */
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <Header />
      <main className="flex-1 relative">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
