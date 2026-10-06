'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'theme-purple' | 'theme-green' | 'theme-gold';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'theme-purple',
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>('theme-purple');

  useEffect(() => {
    // Read theme from localStorage or default to GHOST PURPLE
    const saved = localStorage.getItem('ghost_game_zone_theme') as AppTheme;
    if (saved && ['theme-purple', 'theme-green', 'theme-gold'].includes(saved)) {
      setThemeState(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      setThemeState('theme-purple');
      document.documentElement.setAttribute('data-theme', 'theme-purple');
    }
  }, []);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('ghost_game_zone_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
