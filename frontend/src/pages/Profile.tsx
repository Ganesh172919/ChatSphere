import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save, User, Mail, Calendar, Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuthStore } from '../store/authStore';
import { updateProfile } from '../api/users';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, login, accessToken, refreshToken } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 375000) {
      toast.error('Image too large. Max 375KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user || !accessToken || !refreshToken) return;
    setSaving(true);
    try {
      const updated = await updateProfile({ displayName, bio, avatar });
      // Update local auth store with new data
      login(
        { ...user, displayName: updated.displayName, avatar: updated.avatar as string | undefined },
        accessToken,
        refreshToken
      );
      toast.success('Profile updated!');
    } catch (err) {
      console.error('Save profile error:', err);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-navy-900">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors mb-4">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 className="font-display font-bold text-3xl text-white">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Customize your appearance and information</p>
        </motion.div>

        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-navy-800/80 rounded-2xl border border-navy-700/50 backdrop-blur-lg p-8 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-navy-600 group-hover:border-neon-purple/50 transition-colors"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-2xl font-bold text-white border-2 border-navy-600 group-hover:border-neon-purple/50 transition-colors">
                  {getInitials(user?.username || 'U')}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-neon-purple text-white flex items-center justify-center hover:bg-purple-500 transition-colors shadow-lg"
                aria-label="Change avatar"
              >
                <Camera size={14} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name fields */}
            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-xl bg-navy-700 border border-navy-600/50 text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors"
                  placeholder="Your display name"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-navy-700 border border-navy-600/50 text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors resize-none"
                  placeholder="Tell us about yourself..."
                />
                <p className="text-right text-[10px] text-gray-600 mt-1">{bio.length}/200</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-navy-800/80 rounded-2xl border border-navy-700/50 backdrop-blur-lg p-8 mb-6"
        >
          <h2 className="font-display font-bold text-lg text-white mb-5">Account Information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-700/30">
              <User size={16} className="text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Username</p>
                <p className="text-sm text-gray-300 font-medium">{user?.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-700/30">
              <Mail size={16} className="text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Email</p>
                <p className="text-sm text-gray-300 font-medium">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-700/30">
              <Shield size={16} className="text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Auth Provider</p>
                <p className="text-sm text-gray-300 font-medium capitalize">{user?.authProvider || 'Local'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-700/30">
              <Calendar size={16} className="text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Member Since</p>
                <p className="text-sm text-gray-300 font-medium">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end"
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white font-semibold hover:shadow-2xl hover:shadow-purple-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </motion.div>
      </main>
    </div>
  );
}
