import { useEffect, useRef } from 'react';
import { fetchSettings } from '../api/settings';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';

export default function ThemeSettingsSync() {
  const { user, isAuthenticated } = useAuthStore();
  const { setAccentColor, setCustomTheme, setThemeMode } = useTheme();
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || syncedUserIdRef.current === user.id) {
      return;
    }

    let cancelled = false;

    const syncTheme = async () => {
      try {
        const settings = await fetchSettings();
        if (cancelled) {
          return;
        }

        setThemeMode(settings.theme.mode);
        setCustomTheme(settings.theme.customTheme as Parameters<typeof setCustomTheme>[0]);
        setAccentColor(settings.accentColor);
        syncedUserIdRef.current = user.id;
      } catch (error) {
        console.error('Failed to sync theme settings', error);
      }
    };

    void syncTheme();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setAccentColor, setCustomTheme, setThemeMode, user?.id]);

  return null;
}
