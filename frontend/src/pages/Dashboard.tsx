import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare, Users, Search, TrendingUp,
  ArrowRight, Clock, Zap, Globe,
  Activity, Shield, Tag,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuthStore } from '../store/authStore';
import { fetchDashboard } from '../api/dashboard';
import type { DashboardData } from '../api/dashboard';

// ─── PASTE YOUR IMAGE URL HERE ───────────────────────────────────────────────
const COLLABORATION_IMAGE_URL = 'https://i.pinimg.com/736x/80/0c/d6/800cd63b0e75501dc70fc9e39b06dfcc.jpg';
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="p-4 rounded-xl bg-navy-800/60 border border-navy-700/50 hover:border-navy-600/80 hover:bg-navy-800/80 transition-all duration-200 backdrop-blur-sm"
    >
      <div className="mb-2">
        <Icon size={14} className="text-gray-500" />
      </div>
      <p className="text-xl font-semibold text-white tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await fetchDashboard();
        setData(result);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const topTags = Array.from(
    new Set((data?.recentRooms || []).flatMap((room) => room.tags))
  ).slice(0, 4);

  const adminRooms = (data?.recentRooms || []).filter(
    (room) => room.currentUserRole === 'creator' || room.currentUserRole === 'admin'
  );

  const collaborationTone = !data
    ? 'Loading your collaboration profile...'
    : data.stats.totalRooms >= 4
    ? 'You are running a multi-room collaboration flow with steady member activity.'
    : data.stats.totalConversations >= 5
    ? 'You are balancing focused solo work with room-based collaboration.'
    : 'Your workspace is set up for a lighter, more deliberate conversation pace.';

  const analysisCards = data
    ? [
        {
          icon: Activity,
          title: 'Momentum',
          value:
            data.stats.messagesToday > 20
              ? 'High'
              : data.stats.messagesToday > 5
              ? 'Steady'
              : 'Building',
          text: `${data.stats.messagesToday} messages today.`,
        },
        {
          icon: Shield,
          title: 'Leadership',
          value: `${adminRooms.length}`,
          text:
            adminRooms.length > 0
              ? 'Rooms under your management.'
              : 'Contributing as a member.',
        },
        {
          icon: Tag,
          title: 'Top Tag',
          value: topTags.length > 0 ? topTags[0] : '—',
          text:
            topTags.length > 0
              ? topTags.map((tag) => `#${tag}`).join(' · ')
              : 'No tags yet.',
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-black dot-grid relative overflow-hidden">
      <Navbar />

      {/* Gradient mesh */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] animate-[drift1_18s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] rounded-full bg-violet-500/8 blur-[100px] animate-[drift2_22s_ease-in-out_infinite]" />
        <div className="absolute -bottom-20 left-1/3 w-[350px] h-[350px] rounded-full bg-sky-500/6 blur-[110px] animate-[drift3_26s_ease-in-out_infinite]" />
      </div>

      <div className="flex min-h-screen pt-14">

        {/* ── LEFT PANEL ── */}
        <main className="flex-1 overflow-y-auto px-6 lg:px-10 py-10 max-w-3xl">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <p className="text-sm text-gray-500 mb-1">{greeting()}</p>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {user?.displayName || user?.username}
            </h1>
            <p className="text-sm text-gray-400 mt-1.5">{collaborationTone}</p>
          </motion.div>

          {/* Stats */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-navy-800/50 border border-navy-700/30 animate-pulse" />
              ))}
            </div>
          ) : (
            data && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                <StatCard icon={MessageSquare} label="Conversations" value={data.stats.totalConversations} delay={0.05} />
                <StatCard icon={Users} label="Rooms" value={data.stats.totalRooms} delay={0.1} />
                <StatCard icon={Zap} label="Messages" value={data.stats.totalMessagesSent} delay={0.15} />
                <StatCard icon={TrendingUp} label="Today" value={data.stats.messagesToday} delay={0.2} />
              </div>
            )
          )}

          {/* Analysis Cards */}
          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              {analysisCards.map(({ icon: Icon, title, value, text }, index) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + index * 0.05, duration: 0.3 }}
                  className="rounded-xl bg-navy-800/60 border border-navy-700/50 p-4 backdrop-blur-sm"
                >
                  <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-lg bg-navy-700/80">
                    <Icon size={13} className="text-gray-400" />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-600 font-medium mb-1">
                    {title}
                  </p>
                  <p className="text-lg font-semibold text-white mb-1">{value}</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{text}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            className="mb-8"
          >
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-600 mb-3">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { to: '/chat', icon: MessageSquare, label: 'Solo AI Chat', sub: '1-on-1 reasoning with Gemini' },
                { to: '/rooms', icon: Users, label: 'Group Rooms', sub: 'Collaborate with @ai mentions' },
                { to: '/search', icon: Search, label: 'Search Messages', sub: 'Find anything across all chats' },
                { to: '/export', icon: Globe, label: 'Exports', sub: 'Download conversations and room history' },
              ].map(({ to, icon: Icon, label, sub }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-navy-800/60 border border-navy-700/50 hover:border-navy-600/80 hover:bg-navy-800/80 transition-all duration-200 backdrop-blur-sm"
                >
                  <div className="w-7 h-7 rounded-lg bg-navy-700/80 flex items-center justify-center flex-shrink-0 group-hover:bg-navy-600/80 transition-colors">
                    <Icon size={13} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 leading-tight">{label}</p>
                    <p className="text-[11px] text-gray-500 truncate">{sub}</p>
                  </div>
                  <ArrowRight size={12} className="text-navy-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity + Rooms row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-600 mb-3 flex items-center gap-1.5">
                <Clock size={11} />
                Recent Activity
              </h2>
              <div className="bg-navy-800/60 rounded-xl border border-navy-700/50 p-3 space-y-0.5 max-h-72 overflow-y-auto backdrop-blur-sm">
                {!data || data.activity.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No recent activity</p>
                    <p className="text-xs text-gray-600 mt-1">Start chatting to see activity here</p>
                  </div>
                ) : (
                  data.activity.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.04 }}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-navy-700/40 transition-colors"
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${item.type === 'ai_response' ? 'bg-navy-600' : 'bg-navy-700'}`}>
                        <MessageSquare size={10} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 truncate">{item.content}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.roomName && (
                            <span className="text-[10px] text-gray-500">#{item.roomName}</span>
                          )}
                          <span className="text-[10px] text-gray-600">{formatTime(item.timestamp)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Recent Rooms */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.3 }}
            >
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-600 mb-3 flex items-center gap-1.5">
                <Users size={11} />
                Recent Rooms
              </h2>
              <div className="bg-navy-800/60 rounded-xl border border-navy-700/50 p-3 space-y-2 max-h-72 overflow-y-auto backdrop-blur-sm">
                {!data || data.recentRooms.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No rooms yet</p>
                    <Link to="/rooms" className="text-xs text-gray-400 hover:text-gray-200 mt-1 inline-block underline underline-offset-2 transition-colors">
                      Create your first room →
                    </Link>
                  </div>
                ) : (
                  data.recentRooms.map((room, i) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.55 + i * 0.06 }}
                    >
                      <Link
                        to={`/group/${room.id}`}
                        className="block p-2.5 rounded-lg bg-navy-700/30 border border-navy-700/40 hover:border-navy-600/60 hover:bg-navy-700/50 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-xs font-medium text-gray-200 group-hover:text-white transition-colors truncate">
                            {room.name}
                          </h3>
                          <ArrowRight size={11} className="text-navy-600 group-hover:text-gray-400 transition-all flex-shrink-0 ml-2" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[10px] text-gray-500">
                          <span className="px-1.5 py-0.5 rounded bg-navy-700/60 border border-navy-600/40">
                            {room.memberCount} members
                          </span>
                          {room.currentUserRole && (
                            <span className="px-1.5 py-0.5 rounded bg-navy-700/60 border border-navy-600/40 capitalize">
                              {room.currentUserRole}
                            </span>
                          )}
                        </div>
                        {room.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {room.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-navy-700/40 border border-navy-600/30 text-gray-500">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                    </motion.div>
                  ))
                )}
                <Link to="/rooms" className="block text-center text-[11px] text-gray-500 hover:text-gray-300 transition-colors py-1.5 border-t border-navy-700/40 mt-1">
                  View all rooms →
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Keyboard shortcuts */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-8 flex items-center gap-5 text-[11px] text-gray-600"
          >
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-navy-800 border border-navy-700 text-gray-500">Ctrl+K</kbd>
              New chat
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-navy-800 border border-navy-700 text-gray-500">Ctrl+/</kbd>
              Search
            </span>
          </motion.div>
        </main>

        {/* ── RIGHT PANEL — IMAGE ── */}
        <aside className="hidden lg:flex w-[42%] xl:w-[45%] sticky top-14 h-[calc(100vh-3.5rem)] flex-col items-center justify-center border-l border-navy-700/40 bg-navy-800/20 backdrop-blur-sm overflow-hidden">

          {COLLABORATION_IMAGE_URL ? (
            <img
              src={COLLABORATION_IMAGE_URL}
              alt="Team collaboration"
              className="w-full h-full object-cover opacity-90"
            />
          ) : (
            /* Placeholder shown until you paste a URL above */
            <div className="flex flex-col items-center justify-center gap-4 text-center px-10">
              <div className="w-16 h-16 rounded-2xl bg-navy-700/60 border border-navy-600/40 flex items-center justify-center">
                <Users size={28} className="text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-500">Image goes here</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Paste your animated collaboration image URL into{' '}
                <code className="text-gray-500 bg-navy-700/60 px-1.5 py-0.5 rounded text-[10px]">
                  COLLABORATION_IMAGE_URL
                </code>{' '}
                at the top of this file.
              </p>
            </div>
          )}

          {/* Gradient fade at bottom so image blends into the panel */}
          {COLLABORATION_IMAGE_URL && (
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-900/80 to-transparent pointer-events-none" />
          )}
        </aside>

      </div>
    </div>
  );
}
