/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppRoutes } from './AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

