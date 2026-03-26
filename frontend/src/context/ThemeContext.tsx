import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type ThemeMode = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';
type CustomTheme = 'default' | 'midnight' | 'aurora' | 'sunset' | 'ocean' | 'forest';

interface ThemeContextType {
  theme: ResolvedTheme;
  themeMode: ThemeMode;
  customTheme: CustomTheme;
  accentColor: string;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setCustomTheme: (theme: CustomTheme) => void;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  themeMode: 'dark',
  customTheme: 'default',
  accentColor: '#A855F7',
  toggleTheme: () => {},
  setThemeMode: () => {},
  setCustomTheme: () => {},
  setAccentColor: () => {},
});

// CSS custom properties for each theme preset
const THEME_PRESETS: Record<CustomTheme, Record<string, string>> = {
  default: {
    '--theme-primary': '#A855F7',
    '--theme-secondary': '#3B82F6',
    '--theme-accent-glow': 'rgba(168, 85, 247, 0.15)',
  },
  midnight: {
    '--theme-primary': '#06B6D4',
    '--theme-secondary': '#1E40AF',
    '--theme-accent-glow': 'rgba(6, 182, 212, 0.15)',
  },
  aurora: {
    '--theme-primary': '#10B981',
    '--theme-secondary': '#8B5CF6',
    '--theme-accent-glow': 'rgba(16, 185, 129, 0.15)',
  },
  sunset: {
    '--theme-primary': '#F97316',
    '--theme-secondary': '#EC4899',
    '--theme-accent-glow': 'rgba(249, 115, 22, 0.15)',
  },
  ocean: {
    '--theme-primary': '#0891B2',
    '--theme-secondary': '#2563EB',
    '--theme-accent-glow': 'rgba(8, 145, 178, 0.15)',
  },
  forest: {
    '--theme-primary': '#059669',
    '--theme-secondary': '#15803D',
    '--theme-accent-glow': 'rgba(5, 150, 105, 0.15)',
  },
};

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('themeMode');
    return (stored as ThemeMode) || 'dark';
  });

  const [customTheme, setCustomThemeState] = useState<CustomTheme>(() => {
    const stored = localStorage.getItem('customTheme');
    return (stored as CustomTheme) || 'default';
  });

  const [accentColor, setAccentColorState] = useState<string>(() => {
    return localStorage.getItem('accentColor') || '#A855F7';
  });

  const resolvedTheme: ResolvedTheme = themeMode === 'system' ? getSystemTheme() : themeMode;

  // Apply theme classes + CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.classList.toggle('light', resolvedTheme === 'light');

    // Apply custom theme variables
    const preset = THEME_PRESETS[customTheme];
    Object.entries(preset).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply accent color
    root.style.setProperty('--accent-color', accentColor);
  }, [resolvedTheme, customTheme, accentColor]);

  // Listen for system theme changes
  useEffect(() => {
    if (themeMode !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      document.documentElement.classList.toggle('dark', mq.matches);
      document.documentElement.classList.toggle('light', !mq.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('themeMode', next);
      // Also store as 'theme' for backwards compat
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('themeMode', mode);
    if (mode !== 'system') {
      localStorage.setItem('theme', mode);
    }
  }, []);

  const setCustomTheme = useCallback((theme: CustomTheme) => {
    setCustomThemeState(theme);
    localStorage.setItem('customTheme', theme);
  }, []);

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    localStorage.setItem('accentColor', color);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        themeMode,
        customTheme,
        accentColor,
        toggleTheme,
        setThemeMode,
        setCustomTheme,
        setAccentColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
