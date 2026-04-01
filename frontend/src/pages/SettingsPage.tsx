import { useState, useCallback } from 'react'
import { User, Palette, Bot, Save, Bell, Moon, Sun, Monitor } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import api from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import type { User as UserType } from '@/types'

type SettingsTab = 'profile' | 'preferences' | 'ai'

const ACCENT_COLORS = [
  { name: 'Purple', value: '#6c5ce7' },
  { name: 'Blue', value: '#4ecdc4' },
  { name: 'Pink', value: '#fd79a8' },
  { name: 'Orange', value: '#e17055' },
  { name: 'Green', value: '#00b894' },
  { name: 'Red', value: '#ff6b6b' },
]

export default function SettingsPage() {
  const { user, refreshUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [isSaving, setIsSaving] = useState(false)

  // Profile state
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')

  // Preferences state
  const [themeMode, setThemeMode] = useState<'LIGHT' | 'DARK' | 'SYSTEM'>(user?.themeMode ?? 'DARK')
  const [notifications, setNotifications] = useState(user?.notifications ?? true)
  const [accentColor, setAccentColor] = useState(user?.accentColor ?? '#6c5ce7')

  // AI state
  const [aiFeatures, setAiFeatures] = useState(user?.aiFeatures ?? true)
  const [aiModel, setAiModel] = useState('gpt-4')

  const handleSaveProfile = useCallback(async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await api.put('/users/me', {
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      })
      await refreshUser()
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }, [user, displayName, bio, avatarUrl, refreshUser])

  const handleSavePreferences = useCallback(async () => {
    setIsSaving(true)
    try {
      await api.patch('/users/me', {
        themeMode,
        notifications,
        accentColor,
      })
      await refreshUser()
      toast.success('Preferences saved')
    } catch {
      toast.error('Failed to save preferences')
    } finally {
      setIsSaving(false)
    }
  }, [themeMode, notifications, accentColor, refreshUser])

  const handleSaveAi = useCallback(async () => {
    setIsSaving(true)
    try {
      await api.patch('/users/me', {
        aiFeatures,
        aiModel,
      })
      await refreshUser()
      toast.success('AI settings saved')
    } catch {
      toast.error('Failed to save AI settings')
    } finally {
      setIsSaving(false)
    }
  }, [aiFeatures, aiModel, refreshUser])

  const tabs: { key: SettingsTab; label: string; icon: typeof User }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'preferences', label: 'Preferences', icon: Palette },
    { key: 'ai', label: 'AI', icon: Bot },
  ]

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-bg-elevated">
        <h1 className="text-xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-bg-elevated px-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'text-accent-light border-accent'
                : 'text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-xl space-y-6">
            <div>
              <label htmlFor="display-name" className="block text-sm font-medium text-text-secondary mb-1.5">
                Display Name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
                placeholder="Your display name"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-text-secondary mb-1.5">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input-field resize-none"
                rows={3}
                placeholder="Tell us about yourself"
              />
            </div>

            <div>
              <label htmlFor="avatar-url" className="block text-sm font-medium text-text-secondary mb-1.5">
                Avatar URL
              </label>
              <input
                id="avatar-url"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="input-field"
                placeholder="https://example.com/avatar.png"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="max-w-xl space-y-6">
            {/* Theme Mode */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">Theme Mode</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'LIGHT' as const, label: 'Light', icon: Sun },
                  { value: 'DARK' as const, label: 'Dark', icon: Moon },
                  { value: 'SYSTEM' as const, label: 'System', icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setThemeMode(value)}
                    className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                      themeMode === value
                        ? 'border-accent bg-accent/10 text-accent-light'
                        : 'border-bg-elevated bg-bg-tertiary text-text-secondary hover:border-bg-hover'
                    }`}
                  >
                    <Icon size={20} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10 text-accent-light">
                  <Bell size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Notifications</p>
                  <p className="text-xs text-text-muted">Receive push and email notifications</p>
                </div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  notifications ? 'bg-accent' : 'bg-bg-elevated'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    notifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">Accent Color</label>
              <div className="flex gap-3">
                {ACCENT_COLORS.map(({ name, value }) => (
                  <button
                    key={value}
                    onClick={() => setAccentColor(value)}
                    className={`w-9 h-9 rounded-full transition-transform ${
                      accentColor === value ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: value }}
                    title={name}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        )}

        {/* AI Tab */}
        {activeTab === 'ai' && (
          <div className="max-w-xl space-y-6">
            {/* AI Features Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10 text-accent-light">
                  <Bot size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">AI Features</p>
                  <p className="text-xs text-text-muted">Enable AI-powered chat, smart replies, and insights</p>
                </div>
              </div>
              <button
                onClick={() => setAiFeatures(!aiFeatures)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  aiFeatures ? 'bg-accent' : 'bg-bg-elevated'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    aiFeatures ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Model Selection */}
            {aiFeatures && (
              <div>
                <label htmlFor="ai-model" className="block text-sm font-medium text-text-secondary mb-1.5">
                  AI Model
                </label>
                <select
                  id="ai-model"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="input-field"
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3">Claude 3</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="gemini-pro">Gemini Pro</option>
                </select>
              </div>
            )}

            <button
              onClick={handleSaveAi}
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save AI Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
