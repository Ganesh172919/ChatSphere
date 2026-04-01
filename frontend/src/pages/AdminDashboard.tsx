import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Users, MessageSquare, Hash, AlertTriangle,
  CheckCircle, XCircle, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { BarChart, MiniStat, TopRoomsTable } from '../components/AnalyticsCharts';
import { fetchAdminStats, fetchReports, resolveReport, fetchAdminUsers } from '../api/admin';
import { fetchMessageAnalytics, fetchUserAnalytics, fetchTopRooms } from '../api/analytics';
import type { AdminStats, AdminReport, AdminUser } from '../api/admin';
import type { TimeSeriesData, TopRoom } from '../api/analytics';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'reports' | 'users';

const REASON_LABELS: Record<string, string> = {
  spam: '📩 Spam',
  harassment: '😤 Harassment',
  hate_speech: '🚫 Hate Speech',
  inappropriate_content: '⚠️ Inappropriate',
  impersonation: '🎭 Impersonation',
  other: '📝 Other',
};

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [msgData, setMsgData] = useState<TimeSeriesData[]>([]);
  const [userData, setUserData] = useState<TimeSeriesData[]>([]);
  const [topRooms, setTopRooms] = useState<TopRoom[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportFilter, setReportFilter] = useState('pending');
  const [reportPage, setReportPage] = useState(1);
  const [reportTotal, setReportTotal] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (tab === 'reports') loadReports();
  }, [tab, reportFilter, reportPage]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab, userPage]);

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      const [s, m, u, r] = await Promise.all([
        fetchAdminStats(),
        fetchMessageAnalytics(30),
        fetchUserAnalytics(30),
        fetchTopRooms(5),
      ]);
      setStats(s);
      setMsgData(m.data);
      setUserData(u.data);
      setTopRooms(r.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const result = await fetchReports(reportPage, reportFilter);
      setReports(result.reports);
      setReportTotal(result.totalPages);
    } catch {
      toast.error('Failed to load reports');
    }
  };

  const loadUsers = async () => {
    try {
      const result = await fetchAdminUsers(userPage, userSearch);
      setUsers(result.users);
      setUserTotal(result.totalPages);
    } catch {
      toast.error('Failed to load users');
    }
  };

  const handleResolve = async (id: string, status: 'action_taken' | 'dismissed') => {
    try {
      await resolveReport(id, status);
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success(`Report ${status.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to resolve report');
    }
  };

  const handleSearchUsers = (e: React.FormEvent) => {
    e.preventDefault();
    setUserPage(1);
    loadUsers();
  };

  const tabs: { key: Tab; label: string; icon: typeof Shield }[] = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'reports', label: 'Reports', icon: AlertTriangle },
    { key: 'users', label: 'Users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-navy-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Platform management & analytics</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-navy-800 border border-navy-700/50 w-fit">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                tab === key
                  ? 'bg-gradient-to-r from-neon-purple to-neon-blue text-white font-medium shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={14} />
              {label}
              {key === 'reports' && stats && stats.pendingReports > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500 text-white">
                  {stats.pendingReports}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="Total Users" value={stats?.totalUsers || 0} icon="👥" />
              <MiniStat label="Total Rooms" value={stats?.totalRooms || 0} icon="💬" />
              <MiniStat label="Total Messages" value={stats?.totalMessages?.toLocaleString() || '0'} icon="📨" />
              <MiniStat label="Online Now" value={stats?.onlineUsers || 0} icon="🟢" />
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-navy-800 border border-navy-700/50">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <MessageSquare size={14} className="text-neon-purple" />
                  Messages (Last 30 Days)
                </h3>
                {isLoading ? (
                  <div className="h-40 bg-navy-900/50 rounded-xl animate-pulse" />
                ) : (
                  <BarChart data={msgData} color="#A855F7" label="Messages per day" />
                )}
              </div>
              <div className="p-5 rounded-2xl bg-navy-800 border border-navy-700/50">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Users size={14} className="text-neon-blue" />
                  Active Users (Last 30 Days)
                </h3>
                {isLoading ? (
                  <div className="h-40 bg-navy-900/50 rounded-xl animate-pulse" />
                ) : (
                  <BarChart data={userData} color="#3B82F6" label="Active users per day" />
                )}
              </div>
            </div>

            {/* Top rooms */}
            <div className="p-5 rounded-2xl bg-navy-800 border border-navy-700/50">
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Hash size={14} className="text-green-400" />
                Top Rooms by Activity
              </h3>
              <TopRoomsTable rooms={topRooms} />
            </div>
          </motion.div>
        )}

        {/* Reports Tab */}
        {tab === 'reports' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Filter */}
            <div className="flex gap-2">
              {['pending', 'reviewed', 'action_taken', 'dismissed', 'all'].map(f => (
                <button
                  key={f}
                  onClick={() => { setReportFilter(f); setReportPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${
                    reportFilter === f
                      ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                      : 'text-gray-500 hover:text-gray-300 border border-navy-700/30'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Report cards */}
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <AlertTriangle size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No {reportFilter} reports</p>
                </div>
              ) : (
                reports.map(report => (
                  <div key={report.id} className="p-4 rounded-xl bg-navy-800 border border-navy-700/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400">
                            {REASON_LABELS[report.reason] || report.reason}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            {report.targetType === 'user' ? '👤 User' : '💬 Message'}
                          </span>
                        </div>
                        <p className="text-sm text-white">
                          Reported by <span className="text-neon-purple font-medium">{report.reporter.username}</span>
                        </p>
                        {report.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{report.description}</p>
                        )}
                        <p className="text-[10px] text-gray-600 mt-1">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {report.status === 'pending' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleResolve(report.id, 'action_taken')}
                            className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                            title="Take action"
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button
                            onClick={() => handleResolve(report.id, 'dismissed')}
                            className="p-2 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-colors"
                            title="Dismiss"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {reportTotal > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setReportPage(p => Math.max(1, p - 1))}
                  disabled={reportPage === 1}
                  className="p-2 rounded-lg text-gray-500 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-500">Page {reportPage} of {reportTotal}</span>
                <button
                  onClick={() => setReportPage(p => Math.min(reportTotal, p + 1))}
                  disabled={reportPage === reportTotal}
                  className="p-2 rounded-lg text-gray-500 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Search */}
            <form onSubmit={handleSearchUsers} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-navy-800 border border-navy-700/50 text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 transition-colors"
              >
                Search
              </button>
            </form>

            {/* User list */}
            <div className="rounded-xl border border-navy-700/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-800">
                    <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">User</th>
                    <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium hidden md:table-cell">Email</th>
                    <th className="text-center px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Status</th>
                    <th className="text-center px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-navy-700/30 hover:bg-navy-900/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-white text-xs font-bold">
                              {u.username[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-gray-300 font-medium">{u.displayName}</p>
                            <p className="text-[10px] text-gray-600">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          u.onlineStatus === 'online' ? 'bg-green-500' :
                          u.onlineStatus === 'away' ? 'bg-amber-500' : 'bg-gray-600'
                        }`} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.isAdmin ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">Admin</span>
                        ) : (
                          <span className="text-[10px] text-gray-600">User</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-600 text-xs">No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {userTotal > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setUserPage(p => Math.max(1, p - 1))}
                  disabled={userPage === 1}
                  className="p-2 rounded-lg text-gray-500 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-500">Page {userPage} of {userTotal}</span>
                <button
                  onClick={() => setUserPage(p => Math.min(userTotal, p + 1))}
                  disabled={userPage === userTotal}
                  className="p-2 rounded-lg text-gray-500 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
