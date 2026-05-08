import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GeneratePage from './pages/GeneratePage';
import TreePage from './pages/TreePage';
import TimelinePage from './pages/TimelinePage';
import LoginPage from './pages/LoginPage';
import { PrivateRoute } from './components/PrivateRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateRoute />}>
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="/tree" element={<TreePage />} />
        <Route path="/tree/:treeId" element={<TreePage />} />
        <Route path="/tree/timeline" element={<TimelinePage />} />
        <Route path="/tree/:treeId/timeline" element={<TimelinePage />} />
      </Route>
    </Routes>
  );
}

