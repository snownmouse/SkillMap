import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppRoutes } from './AppRoutes';

export function render(url: string) {
  const appHtml = renderToString(
    <StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    </StrictMode>
  );

  return { appHtml };
}
