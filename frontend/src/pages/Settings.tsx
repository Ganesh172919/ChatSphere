import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Palette, Bell, Sparkles, Moon, Sun, Monitor,
  Volume2, VolumeX, MessageSquare, AtSign, Check, UserX, Download, Loader,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { fetchSettings, updateSettings } from '../api/settings';
import type { UserSettings } from '../api/settings';
import { getBlockedUsers, unblockUser } from '../api/moderation';
import type { BlockedUser } from '../api/moderation';
import toast from 'react-hot-toast';

const ACCENT_COLORS = [
  { name: 'Purple', value: '#A855F7' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Indigo', value: '#6366F1' },
];

const CUSTOM_THEMES = [
  { id: 'default', name: 'Default', desc: 'Classic ChatSphere look', gradient: 'from-purple-600 to-blue-600' },
  { id: 'midnight', name: 'Midnight', desc: 'Deep blues and teals', gradient: 'from-blue-900 to-cyan-800' },
  { id: 'aurora', name: 'Aurora', desc: 'Northern lights inspired', gradient: 'from-green-600 to-purple-600' },
  { id: 'sunset', name: 'Sunset', desc: 'Warm oranges and pinks', gradient: 'from-orange-500 to-pink-600' },
  { id: 'ocean', name: 'Ocean', desc: 'Calm sea colors', gradient: 'from-cyan-600 to-blue-700' },
  { id: 'forest', name: 'Forest', desc: 'Natural greens', gradient: 'from-emerald-700 to-green-900' },
];

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch {
      // Use defaults if API fails
      setSettings({
        theme: { mode: 'dark', customTheme: 'default' },
        accentColor: '#A855F7',
        notifications: { sound: true, desktop: true, mentions: true, replies: true },
        aiFeatures: { smartReplies: true, sentimentAnalysis: false, grammarCheck: false },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadBlockedUsers = async () => {
    setLoadingBlocked(true);
    try {
      const data = await getBlockedUsers();
      setBlockedUsers(data);
    } catch {
      // ignore
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await unblockUser(userId);
      setBlockedUsers(prev => prev.filter(u => u.userId !== userId));
      toast.success('User unblocked');
    } catch {
      toast.error('Failed to unblock');
    }
  };

  const handleUpdate = async (key: string, value: unknown) => {
    if (!settings) return;
    setSaving(key);
    try {
      const updated = await updateSettings({ [key]: value });
      setSettings(updated);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const handleThemeMode = (mode: 'dark' | 'light' | 'system') => {
    handleUpdate('theme', { ...settings?.theme, mode });
  };

  const handleCustomTheme = (themeId: string) => {
    handleUpdate('theme', { ...settings?.theme, customTheme: themeId });
  };

  const handleAccentColor = (color: string) => {
    handleUpdate('accentColor', color);
  };

  const handleNotification = (key: keyof UserSettings['notifications'], value: boolean) => {
    handleUpdate('notifications', { ...settings?.notifications, [key]: value });
  };

  const handleAiFeature = (key: keyof UserSettings['aiFeatures'], value: boolean) => {
    handleUpdate('aiFeatures', { ...settings?.aiFeatures, [key]: value });
  };

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-navy-900">
        <Navbar />
        <div className="pt-24 pb-16 px-4 max-w-3xl mx-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-navy-800 animate-pulse mb-6" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Link
            to="/dashboard"
            className="p-2 rounded-lg bg-navy-800 border border-navy-700/50 text-gray-400 hover:text-white hover:border-navy-600 transition-all"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">Settings</h1>
            <p className="text-sm text-gray-500">Customize your ChatSphere experience</p>
          </div>
        </motion.div>

        {/* Theme Mode */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div className="bg-navy-800 rounded-2xl border border-navy-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Palette size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-white">Appearance</h2>
                <p className="text-xs text-gray-500">Theme mode and accent color</p>
              </div>
            </div>

            {/* Mode selector */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { mode: 'dark' as const, icon: Moon, label: 'Dark' },
                { mode: 'light' as const, icon: Sun, label: 'Light' },
                { mode: 'system' as const, icon: Monitor, label: 'System' },
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => handleThemeMode(mode)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    settings.theme.mode === mode
                      ? 'border-neon-purple/50 bg-neon-purple/10 text-white'
                      : 'border-navy-700/50 bg-navy-900/50 text-gray-400 hover:border-navy-600 hover:text-gray-300'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{label}</span>
                  {settings.theme.mode === mode && (
                    <motion.div layoutId="themeCheck" className="w-4 h-4 rounded-full bg-neon-purple flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>

            {/* Accent Color */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-300 mb-3">Accent Color</p>
              <div className="flex flex-wrap gap-3">
                {ACCENT_COLORS.map(({ name, value }) => (
                  <button
                    key={value}
                    onClick={() => handleAccentColor(value)}
                    className={`relative w-10 h-10 rounded-xl transition-all ${
                      settings.accentColor === value
                        ? 'scale-110 ring-2 ring-white/30 ring-offset-2 ring-offset-navy-800'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: value }}
                    title={name}
                    aria-label={`Set accent color to ${name}`}
                  >
                    {settings.accentColor === value && (
                      <Check size={14} className="text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Themes */}
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">Theme Preset</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CUSTOM_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => handleCustomTheme(theme.id)}
                    className={`group relative overflow-hidden rounded-xl border transition-all ${
                      settings.theme.customTheme === theme.id
                        ? 'border-neon-purple/50 ring-1 ring-neon-purple/30'
                        : 'border-navy-700/50 hover:border-navy-600'
                    }`}
                  >
                    <div className={`h-12 bg-gradient-to-r ${theme.gradient}`} />
                    <div className="p-3 bg-navy-900/80">
                      <p className="text-xs font-semibold text-white">{theme.name}</p>
                      <p className="text-[10px] text-gray-500">{theme.desc}</p>
                    </div>
                    {settings.theme.customTheme === theme.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-neon-purple flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Notifications */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="bg-navy-800 rounded-2xl border border-navy-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Bell size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-white">Notifications</h2>
                <p className="text-xs text-gray-500">Control how you receive alerts</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { key: 'sound' as const, icon: settings.notifications.sound ? Volume2 : VolumeX, label: 'Sound Effects', desc: 'Play sounds for new messages' },
                { key: 'desktop' as const, icon: Bell, label: 'Desktop Notifications', desc: 'Show browser push notifications' },
                { key: 'mentions' as const, icon: AtSign, label: 'Mention Alerts', desc: 'Notify when someone @mentions you' },
                { key: 'replies' as const, icon: MessageSquare, label: 'Reply Notifications', desc: 'Notify when someone replies to your message' },
              ].map(({ key, icon: Icon, label, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 rounded-xl bg-navy-900/50 border border-navy-700/30"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-300">{label}</p>
                      <p className="text-[10px] text-gray-600">{desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleNotification(key, !settings.notifications[key])}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.notifications[key] ? 'bg-neon-purple' : 'bg-navy-600'
                    }`}
                    role="switch"
                    aria-checked={settings.notifications[key]}
                    aria-label={label}
                  >
                    <motion.div
                      layout
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                      style={{ left: settings.notifications[key] ? 22 : 2 }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* AI Features */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <div className="bg-navy-800 rounded-2xl border border-navy-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center animate-pulse-glow">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-white">AI Features</h2>
                <p className="text-xs text-gray-500">Powered by Gemini 3 — toggle AI-powered tools</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: 'smartReplies' as const,
                  label: 'Smart Replies',
                  desc: 'AI-generated quick reply suggestions after receiving messages',
                  badge: 'Popular',
                },
                {
                  key: 'sentimentAnalysis' as const,
                  label: 'Sentiment Analysis',
                  desc: 'Show mood/tone indicators on incoming messages',
                  badge: 'Beta',
                },
                {
                  key: 'grammarCheck' as const,
                  label: 'Grammar & Spelling',
                  desc: 'Auto-check your messages for errors before sending',
                  badge: 'Beta',
                },
              ].map(({ key, label, desc, badge }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 rounded-xl bg-navy-900/50 border border-navy-700/30"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Sparkles size={16} className="text-neon-purple flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-300">{label}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          badge === 'Popular'
                            ? 'bg-neon-purple/20 text-neon-purple'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 truncate">{desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAiFeature(key, !settings.aiFeatures[key])}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${
                      settings.aiFeatures[key] ? 'bg-neon-purple' : 'bg-navy-600'
                    }`}
                    role="switch"
                    aria-checked={settings.aiFeatures[key]}
                    aria-label={label}
                  >
                    <motion.div
                      layout
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                      style={{ left: settings.aiFeatures[key] ? 22 : 2 }}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-neon-purple/5 border border-neon-purple/20">
              <p className="text-[11px] text-gray-400">
                <span className="text-neon-purple font-medium">Note:</span> AI features use the Gemini API. Smart replies analyze recent conversation context to generate suggestions. Sentiment analysis and grammar checking process individual messages. No data is stored beyond the current session.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Blocked Users */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="bg-navy-800 rounded-2xl border border-navy-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <UserX size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-white">Blocked Users</h2>
                <p className="text-xs text-gray-500">Manage users you've blocked</p>
              </div>
            </div>

            {loadingBlocked ? (
              <div className="flex items-center justify-center py-6">
                <Loader size={18} className="animate-spin text-gray-500" />
              </div>
            ) : blockedUsers.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-6">No blocked users</p>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map(u => (
                  <div key={u.userId} className="flex items-center justify-between p-3 rounded-xl bg-navy-900/50 border border-navy-700/30">
                    <div className="flex items-center gap-3">
                      {u.avatar ? (
                        <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center text-red-400 text-xs font-bold">
                          {u.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-300 font-medium">{u.displayName}</p>
                        <p className="text-[10px] text-gray-600">@{u.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(u.userId)}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-navy-700 transition-all"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.section>

        {/* Data & Export */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <div className="bg-navy-800 rounded-2xl border border-navy-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Download size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-white">Data & Export</h2>
                <p className="text-xs text-gray-500">Download and manage your data</p>
              </div>
            </div>
            <Link
              to="/export"
              className="flex items-center justify-between p-4 rounded-xl bg-navy-900/50 border border-navy-700/30 hover:border-navy-600 transition-all group"
            >
              <div>
                <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Export Chat History</p>
                <p className="text-[10px] text-gray-600">Download your conversations and room messages as JSON</p>
              </div>
              <ArrowLeft size={14} className="text-gray-600 rotate-180 group-hover:text-gray-400 transition-colors" />
            </Link>
          </div>
        </motion.section>

        {/* Saving indicator */}
        {saving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed bottom-6 right-6 px-4 py-2 rounded-xl bg-navy-800 border border-navy-700/50 text-sm text-gray-400 shadow-lg"
          >
            Saving {saving}...
          </motion.div>
        )}
      </main>
    </div>
  );
}
