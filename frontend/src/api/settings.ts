import api from './axios';

let settingsPromise: Promise<UserSettings> | null = null;
let settingsCache: UserSettings | null = null;
let settingsCacheAt = 0;
const SETTINGS_CACHE_TTL_MS = 15 * 1000;

export interface UserSettings {
  theme: {
    mode: 'dark' | 'light' | 'system';
    customTheme: string;
  };
  accentColor: string;
  notifications: {
    sound: boolean;
    desktop: boolean;
    mentions: boolean;
    replies: boolean;
  };
  aiFeatures: {
    smartReplies: boolean;
    sentimentAnalysis: boolean;
    grammarCheck: boolean;
  };
}

export async function fetchSettings(): Promise<UserSettings> {
  const now = Date.now();
  if (settingsCache && now - settingsCacheAt < SETTINGS_CACHE_TTL_MS) {
    return settingsCache;
  }

  if (!settingsPromise) {
    settingsPromise = api.get<UserSettings>('/settings')
      .then(({ data }) => {
        settingsCache = data;
        settingsCacheAt = Date.now();
        return data;
      })
      .finally(() => {
        settingsPromise = null;
      });
  }

  return settingsPromise;
}

export async function updateSettings(settings: Partial<{
  theme: Partial<UserSettings['theme']>;
  accentColor: string;
  notifications: Partial<UserSettings['notifications']>;
  aiFeatures: Partial<UserSettings['aiFeatures']>;
}>): Promise<UserSettings> {
  const { data } = await api.put<UserSettings>('/settings', settings);
  settingsCache = data;
  settingsCacheAt = Date.now();
  return data;
}
