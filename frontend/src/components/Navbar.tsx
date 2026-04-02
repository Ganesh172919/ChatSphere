import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare, Users, LogOut, LayoutDashboard, Search,
  User, Settings, Shield, Brain, FolderKanban, ChevronDown,
} from 'lucide-react';
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

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');
  const isActiveExact = (path: string) => location.pathname === path;

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/chat', label: 'Solo Chat', icon: MessageSquare, exact: false },
    { to: '/projects', label: 'Projects', icon: FolderKanban, exact: false },
    { to: '/rooms', label: 'Rooms', icon: Users, exact: false, alsoActive: '/group' },
    { to: '/search', label: 'Search', icon: Search, exact: false },
    { to: '/memory', label: 'Memory', icon: Brain, exact: false },
  ];

  return (
    <motion.nav
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo — text only */}
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="text-base font-semibold text-gray-900 tracking-tight hover:text-gray-700 transition-colors"
          >
            ChatSphere
          </Link>

          {/* Nav links */}
          {isAuthenticated && (
            <div className="flex items-center gap-0.5">
              {navLinks.map(({ to, label, icon: Icon, exact, alsoActive }) => {
                const active = exact
                  ? isActiveExact(to)
                  : isActive(to) || (alsoActive ? isActive(alsoActive) : false);

                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={14} />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-sm text-gray-700"
                  aria-label="User menu"
                  aria-expanded={showProfileMenu}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-semibold text-gray-600 uppercase">
                      {user.username.slice(0, 2)}
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">
                    {user.username}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-gray-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown */}
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 w-44 py-1 rounded-xl bg-white border border-gray-200 shadow-lg shadow-gray-100 z-50"
                    role="menu"
                  >
                    <Link
                      to="/profile"
                      className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                      role="menuitem"
                    >
                      <User size={13} className="text-gray-400" />
                      My Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                      role="menuitem"
                    >
                      <Settings size={13} className="text-gray-400" />
                      Settings
                    </Link>
                    {user.isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                        role="menuitem"
                      >
                        <Shield size={13} className="text-gray-400" />
                        Admin Panel
                      </Link>
                    )}
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                      role="menuitem"
                    >
                      <LogOut size={13} />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
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