import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const PrivateRoute: React.FC = () => {
  const { state } = useAppContext();
  const isAuthenticated = state.auth?.token && state.auth?.user;

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};