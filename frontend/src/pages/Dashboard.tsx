import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare, Users, Search, Sparkles, TrendingUp,
  ArrowRight, Clock, Zap, Globe, Brain, Quote, Crown, Radar, FolderKanban,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuthStore } from '../store/authStore';
import { fetchDashboard } from '../api/dashboard';
import type { DashboardData } from '../api/dashboard';

function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{count.toLocaleString()}</span>;
}

function StatCard({
  icon: Icon, label, value, gradient, delay,
}: {
  icon: React.ElementType; label: string; value: number; gradient: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      className="relative group"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
        style={{ background: `linear-gradient(135deg, ${gradient})` }}
      />
      <div className="p-6 rounded-2xl bg-navy-800/80 border border-navy-700/50 backdrop-blur-lg hover:border-navy-600/80 transition-all duration-300 group-hover:shadow-2xl">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={22} className="text-white" />
        </div>
        <p className="text-3xl font-display font-bold text-white mb-1">
          <AnimatedCounter value={value} />
        </p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
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

  const featuredQuote = data?.activity.find((item) => item.content.trim().length >= 24) || data?.activity[0] || null;
  const topTags = Array.from(new Set((data?.recentRooms || []).flatMap((room) => room.tags))).slice(0, 4);
  const adminRooms = (data?.recentRooms || []).filter((room) => room.currentUserRole === 'creator' || room.currentUserRole === 'admin');
  const collaborationTone = !data
    ? 'Loading your collaboration profile...'
    : data.stats.totalRooms >= 4
      ? 'You are running a multi-room collaboration flow with steady member activity.'
      : data.stats.totalConversations >= 5
        ? 'You are balancing focused solo work with room-based collaboration.'
        : 'Your workspace is set up for a lighter, more deliberate conversation pace.';
  const analysisCards = data ? [
    {
      icon: Radar,
      title: 'Momentum',
      value: data.stats.messagesToday > 20 ? 'High' : data.stats.messagesToday > 5 ? 'Steady' : 'Building',
      text: `${data.stats.messagesToday} messages today across your active spaces.`,
      accent: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Crown,
      title: 'Leadership',
      value: `${adminRooms.length}`,
      text: adminRooms.length > 0 ? 'Rooms where you can guide members and manage access.' : 'You are currently contributing as a member.',
      accent: 'from-amber-500 to-orange-500',
    },
    {
      icon: FolderKanban,
      title: 'Focus Tags',
      value: topTags.length > 0 ? topTags[0] : 'None',
      text: topTags.length > 0 ? topTags.map((tag) => `#${tag}`).join(' · ') : 'Create or join tagged rooms to build topic analysis.',
      accent: 'from-cyan-500 to-blue-500',
    },
  ] : [];

  return (
    <div className="min-h-screen bg-navy-900 relative overflow-hidden">
      <Navbar />

      {/* Animated background orbs */}
      <div className="orb w-[600px] h-[600px] bg-neon-purple/10 -top-40 -right-40 animate-float" />
      <div className="orb w-[400px] h-[400px] bg-neon-blue/8 bottom-20 -left-20 animate-float" style={{ animationDelay: '3s' }} />
      <div className="orb w-[300px] h-[300px] bg-neon-coral/6 top-1/2 right-1/4 animate-float" style={{ animationDelay: '5s' }} />

      <main className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Hero Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-gray-500 text-sm mb-1"
              >
                {greeting()},
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display font-bold text-4xl sm:text-5xl"
              >
                <span className="text-white">{user?.displayName || user?.username}</span>
                <span className="inline-block ml-3 animate-bounce">👋</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-500 mt-2 text-sm"
              >
                Here's what's happening in your ChatSphere
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3"
            >
              <Link
                to="/search"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-800 border border-navy-700/50 text-gray-400 hover:text-white hover:border-neon-purple/30 transition-all text-sm"
              >
                <Search size={16} />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-navy-700 text-gray-600 text-[10px] font-mono border border-navy-600 ml-2">Ctrl+/</kbd>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-navy-800 animate-pulse border border-navy-700/30" />
            ))}
          </div>
        ) : data && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            <StatCard icon={MessageSquare} label="Conversations" value={data.stats.totalConversations} gradient="from-violet-500 to-purple-600" delay={0.1} />
            <StatCard icon={Users} label="Total Rooms" value={data.stats.totalRooms} gradient="from-blue-500 to-cyan-500" delay={0.15} />
            <StatCard icon={Zap} label="Messages Sent" value={data.stats.totalMessagesSent} gradient="from-amber-500 to-orange-500" delay={0.2} />
            <StatCard icon={TrendingUp} label="Today" value={data.stats.messagesToday} gradient="from-emerald-500 to-teal-500" delay={0.25} />
            <StatCard icon={Globe} label="Online Now" value={data.stats.onlineUsers} gradient="from-rose-500 to-pink-500" delay={0.3} />
          </div>
        )}

        {/* Quote + Analysis */}
        {data && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="xl:col-span-2 rounded-3xl border border-neon-purple/20 bg-gradient-to-br from-navy-800/95 via-navy-800/80 to-violet-950/60 p-6 backdrop-blur-lg"
            >
              <div className="flex items-center gap-2 text-neon-purple mb-4">
                <Quote size={18} />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Conversation Quote</span>
              </div>
              <p className="font-display text-2xl leading-relaxed text-white">
                {featuredQuote ? `“${featuredQuote.content}”` : '“Your next strong conversation will show up here once activity starts flowing.”'}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                {featuredQuote?.roomName ? <span className="rounded-full border border-navy-600/50 bg-navy-900/40 px-3 py-1">#{featuredQuote.roomName}</span> : null}
                {featuredQuote ? <span>{formatTime(featuredQuote.timestamp)}</span> : null}
              </div>
              <p className="mt-5 text-sm text-gray-400">{collaborationTone}</p>
            </motion.div>

            <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              {analysisCards.map(({ icon: Icon, title, value, text, accent }, index) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36 + (index * 0.05) }}
                  className="rounded-2xl border border-navy-700/50 bg-navy-800/70 p-5 backdrop-blur-lg"
                >
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent}`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">{title}</p>
                  <p className="font-display text-2xl text-white mb-2">{value}</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="lg:col-span-1 space-y-4"
          >
            <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <Sparkles size={18} className="text-neon-purple" />
              Quick Actions
            </h2>

            <Link
              to="/chat"
              className="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-navy-800/90 to-navy-800/60 border border-navy-700/50 hover:border-neon-purple/40 transition-all duration-300 backdrop-blur-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple to-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-white">Solo AI Chat</p>
                <p className="text-xs text-gray-500">Deep 1-on-1 reasoning with Gemini</p>
              </div>
              <ArrowRight size={16} className="text-gray-600 group-hover:text-neon-purple group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/rooms"
              className="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-navy-800/90 to-navy-800/60 border border-navy-700/50 hover:border-neon-blue/40 transition-all duration-300 backdrop-blur-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-blue to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-white">Group Rooms</p>
                <p className="text-xs text-gray-500">Collaborate with @ai mentions</p>
              </div>
              <ArrowRight size={16} className="text-gray-600 group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/search"
              className="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-navy-800/90 to-navy-800/60 border border-navy-700/50 hover:border-neon-coral/40 transition-all duration-300 backdrop-blur-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-coral to-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Search size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-white">Search Messages</p>
                <p className="text-xs text-gray-500">Find anything across all chats</p>
              </div>
              <ArrowRight size={16} className="text-gray-600 group-hover:text-neon-coral group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/projects"
              className="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-navy-800/90 to-navy-800/60 border border-navy-700/50 hover:border-fuchsia-400/40 transition-all duration-300 backdrop-blur-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderKanban size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-white">Projects</p>
                <p className="text-xs text-gray-500">Context-rich AI workspaces with reusable files</p>
              </div>
              <ArrowRight size={16} className="text-gray-600 group-hover:text-fuchsia-400 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/memory"
              className="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-navy-800/90 to-navy-800/60 border border-navy-700/50 hover:border-emerald-500/40 transition-all duration-300 backdrop-blur-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Brain size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-white">Memory Center</p>
                <p className="text-xs text-gray-500">Review what ChatSphere remembers</p>
              </div>
              <ArrowRight size={16} className="text-gray-600 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </Link>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-1"
          >
            <h2 className="font-display font-bold text-lg text-white flex items-center gap-2 mb-4">
              <Clock size={18} className="text-neon-blue" />
              Recent Activity
            </h2>

            <div className="bg-navy-800/60 rounded-2xl border border-navy-700/50 backdrop-blur-lg p-4 space-y-1 max-h-[500px] overflow-y-auto">
              {!data || data.activity.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare size={32} className="text-navy-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No recent activity</p>
                  <p className="text-gray-600 text-xs mt-1">Start chatting to see your activity here</p>
                </div>
              ) : (
                data.activity.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-navy-700/40 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === 'ai_response'
                        ? 'bg-gradient-to-br from-neon-purple to-neon-blue'
                        : 'bg-navy-700'
                    }`}>
                      {item.type === 'ai_response' ? (
                        <Sparkles size={14} className="text-white" />
                      ) : (
                        <MessageSquare size={14} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{item.content}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.roomName && (
                          <span className="text-[10px] text-neon-purple font-medium">#{item.roomName}</span>
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="lg:col-span-1"
          >
            <h2 className="font-display font-bold text-lg text-white flex items-center gap-2 mb-4">
              <Users size={18} className="text-neon-coral" />
              Recent Rooms
            </h2>

            <div className="bg-navy-800/60 rounded-2xl border border-navy-700/50 backdrop-blur-lg p-4 space-y-3">
              {!data || data.recentRooms.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={32} className="text-navy-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No rooms yet</p>
                  <Link to="/rooms" className="text-neon-purple text-xs hover:underline mt-1 inline-block">
                    Create your first room →
                  </Link>
                </div>
              ) : (
                data.recentRooms.map((room, i) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.08 }}
                  >
                    <Link
                      to={`/group/${room.id}`}
                      className="block p-4 rounded-xl bg-navy-700/30 border border-navy-700/40 hover:border-neon-purple/30 hover:bg-navy-700/50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display font-semibold text-white text-sm group-hover:text-neon-purple transition-colors">{room.name}</h3>
                        <ArrowRight size={14} className="text-gray-600 group-hover:text-neon-purple group-hover:translate-x-1 transition-all" />
                      </div>
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                        <span className="rounded-full border border-navy-600/40 bg-navy-900/30 px-2 py-0.5">
                          {room.memberCount} members
                        </span>
                        {room.currentUserRole ? (
                          <span className="rounded-full border border-neon-blue/20 bg-neon-blue/10 px-2 py-0.5 capitalize text-neon-blue">
                            {room.currentUserRole}
                          </span>
                        ) : null}
                      </div>
                      {room.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{room.description}</p>
                      )}
                      {room.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {room.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-navy-600/50 text-gray-400 border border-navy-600/30">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  </motion.div>
                ))
              )}

              <Link
                to="/rooms"
                className="block text-center text-sm text-neon-purple hover:text-purple-300 transition-colors py-2"
              >
                View all rooms →
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Keyboard shortcuts hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-6 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-navy-700 text-gray-500 text-[10px] font-mono border border-navy-600">Ctrl+K</kbd>
              New chat
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-navy-700 text-gray-500 text-[10px] font-mono border border-navy-600">Ctrl+/</kbd>
              Search
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
