import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Users, LogOut, Sparkles, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { logoutUser } from '../api/auth';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshToken, logout, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { disconnect } = useSocket();

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logoutUser(refreshToken);
      }
    } catch {
      // Ignore logout errors
    }
    disconnect();
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-navy-700/50 backdrop-blur-xl bg-navy-900/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isAuthenticated ? '/chat' : '/'} className="flex items-center gap-2 group">
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
                to="/chat"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/chat')
                    ? 'bg-navy-700 text-white shadow-inner'
                    : 'text-gray-400 hover:text-white hover:bg-navy-800'
                }`}
              >
                <MessageSquare size={16} />
                <span className="hidden sm:inline">Solo Chat</span>
              </Link>
              <Link
                to="/rooms"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/rooms') || isActive('/group')
                    ? 'bg-navy-700 text-white shadow-inner'
                    : 'text-gray-400 hover:text-white hover:bg-navy-800'
                }`}
              >
                <Users size={16} />
                <span className="hidden sm:inline">Rooms</span>
              </Link>
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-navy-800 transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isAuthenticated && user && (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-700">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-purple to-neon-coral flex items-center justify-center text-[10px] font-bold uppercase">
                    {user.username.slice(0, 2)}
                  </div>
                  <span className="text-sm text-gray-300">{user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-navy-800 transition-all"
                  aria-label="Logout"
                >
                  <LogOut size={18} />
                </button>
              </>
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
