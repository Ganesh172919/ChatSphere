import api from './axios';

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
  const { data } = await api.get<UserSettings>('/settings');
  return data;
}

export async function updateSettings(settings: Partial<{
  theme: Partial<UserSettings['theme']>;
  accentColor: string;
  notifications: Partial<UserSettings['notifications']>;
  aiFeatures: Partial<UserSettings['aiFeatures']>;
}>): Promise<UserSettings> {
  const { data } = await api.put<UserSettings>('/settings', settings);
  return data;
}
