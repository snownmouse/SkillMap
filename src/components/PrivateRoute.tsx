import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const PrivateRoute: React.FC = () => {
  const { state } = useAppContext();
  if (!state.authHydrated) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-app-text font-bold">正在恢复登录状态...</p>
          <p className="text-sm text-app-muted">请稍候，正在验证本地会话。</p>
        </div>
      </div>
    );
  }

  const isAuthenticated = state.auth?.token && state.auth?.user;

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};
