/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import HomePage from './pages/HomePage';
import GeneratePage from './pages/GeneratePage';
import TreePage from './pages/TreePage';
import TimelinePage from './pages/TimelinePage';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/tree" element={<TreePage />} />
          <Route path="/tree/timeline" element={<TimelinePage />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

