import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../services/storage';

export type ThemeMode = 'default' | 'childrens_day' | 'growth' | 'hidden';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface StoredThemeState {
  theme: ThemeMode;
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('default');

  useEffect(() => {
    const saved = storage.load();
    if (saved && (saved as StoredThemeState).theme) {
      setThemeState((saved as StoredThemeState).theme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const currentState = storage.load() || {};
    storage.save({ ...currentState, theme });
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const cycleTheme = () => {
    setThemeState(prev => {
      switch (prev) {
        case 'default': return 'childrens_day';
        case 'childrens_day': return 'growth';
        case 'growth': return 'hidden';
        case 'hidden': return 'default';
        default: return 'default';
      }
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
