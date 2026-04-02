import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Users, LogOut, Sparkles, LayoutDashboard, Search, User, Settings, Shield, Brain, FolderKanban } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { logoutUser } from '../api/auth';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { disconnect } = useSocket();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close profile menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore logout errors
    }
    disconnect();
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const isActiveExact = (path: string) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-navy-700/50 backdrop-blur-xl bg-navy-900/80"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center group-hover:shadow-lg group-hover:shadow-purple-500/25 transition-shadow">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              ChatSphere
            </span>
          </Link>

          {/* Nav links */}
          {isAuthenticated && (
            <div className="flex items-center gap-1">
              <Link
                to="/dashboard"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActiveExact('/dashboard')
                    ? 'bg-navy-700 text-white shadow-inner'
                    : 'text-gray-400 hover:text-white hover:bg-navy-800'
                }`}
                aria-current={isActiveExact('/dashboard') ? 'page' : undefined}
              >
                <LayoutDashboard size={16} />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                to="/chat"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/chat')
                    ? 'bg-navy-700 text-white shadow-inner'
                    : 'text-gray-400 hover:text-white hover:bg-navy-800'
                }`}
                aria-current={isActive('/chat') ? 'page' : undefined}
              >
                <MessageSquare size={16} />
                <span className="hidden sm:inline">Solo Chat</span>
              </Link>
              <Link
                to="/projects"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/projects')
                    ? 'bg-navy-700 text-white shadow-inner'
                    : 'text-gray-400 hover:text-white hover:bg-navy-800'
                }`}
                aria-current={isActive('/projects') ? 'page' : undefined}
              >
                <FolderKanban size={16} />
                <span className="hidden md:inline">Projects</span>
              </Link>
              <Link
                to="/rooms"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/rooms') || isActive('/group')
                    ? 'bg-navy-700 text-white shadow-inner'
                    : 'text-gray-400 hover:text-white hover:bg-navy-800'
                }`}
                aria-current={isActive('/rooms') || isActive('/group') ? 'page' : undefined}
              >
                <Users size={16} />
                <span className="hidden sm:inline">Rooms</span>
              </Link>
              <Link
                to="/search"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/search')
                    ? 'bg-navy-700 text-white shadow-inner'
                    : 'text-gray-400 hover:text-white hover:bg-navy-800'
                }`}
                aria-current={isActive('/search') ? 'page' : undefined}
              >
                <Search size={16} />
                <span className="hidden lg:inline">Search</span>
              </Link>
              <Link
                to="/memory"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/memory')
                    ? 'bg-navy-700 text-white shadow-inner'
                    : 'text-gray-400 hover:text-white hover:bg-navy-800'
                }`}
                aria-current={isActive('/memory') ? 'page' : undefined}
              >
                <Brain size={16} />
                <span className="hidden xl:inline">Memory</span>
              </Link>
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAuthenticated && user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-700 hover:border-navy-600 transition-all"
                  aria-label="User menu"
                  aria-expanded={showProfileMenu}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-purple to-neon-coral flex items-center justify-center text-[10px] font-bold uppercase">
                      {user.username.slice(0, 2)}
                    </div>
                  )}
                  <span className="text-sm text-gray-300 hidden sm:inline">{user.username}</span>
                </button>

                {/* Profile dropdown */}
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 top-full mt-2 w-48 py-2 rounded-xl bg-navy-800 border border-navy-700/50 shadow-xl z-50"
                    role="menu"
                  >
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-navy-700 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                      role="menuitem"
                    >
                      <User size={14} />
                      My Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-navy-700 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                      role="menuitem"
                    >
                      <Settings size={14} />
                      Settings
                    </Link>
                    {user.isAdmin ? (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-navy-700 transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                        role="menuitem"
                      >
                        <Shield size={14} />
                        Admin Panel
                      </Link>
                    ) : null}
                    <div className="border-t border-navy-700/50 my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-navy-700 transition-colors"
                      role="menuitem"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-shadow"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
