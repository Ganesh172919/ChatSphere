import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Sparkles, Check, X } from 'lucide-react';
import { registerUser } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const GOOGLE_AUTH_URL = '/api/auth/google';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordStrength = useMemo(() => {
    const checks = [
      { label: '6+ characters', met: password.length >= 6 },
      { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'Number', met: /[0-9]/.test(password) },
      { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
    ];
    const score = checks.filter((c) => c.met).length;
    return { checks, score };
  }, [password]);

  const strengthColor =
    passwordStrength.score <= 1 ? 'bg-red-500' :
    passwordStrength.score <= 2 ? 'bg-orange-500' :
    passwordStrength.score <= 3 ? 'bg-yellow-500' :
    'bg-green-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (username.length < 3 || username.length > 30) {
      toast.error('Username must be 3-30 characters');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const data = await registerUser(username.trim(), email.trim(), password);
      login(data.user, data.accessToken);
      toast.success(`Welcome, ${data.user.username}! 🎉`);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = GOOGLE_AUTH_URL;
  };

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="orb w-80 h-80 bg-neon-coral/15 top-1/3 left-1/4 animate-float" />
        <div className="orb w-96 h-96 bg-neon-purple/15 bottom-1/4 right-1/3 animate-float" style={{ animationDelay: '2s' }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="relative z-10 max-w-md px-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-coral to-neon-purple flex items-center justify-center mb-8 animate-pulse-glow">
            <Sparkles size={28} className="text-white" />
          </div>
          <blockquote className="font-display text-3xl font-bold text-white leading-snug mb-4">
            &ldquo;Intelligence is the ability to adapt to change.&rdquo;
          </blockquote>
          <p className="text-gray-500 text-sm">&mdash; Stephen Hawking</p>
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4">
              <Sparkles size={16} className="text-neon-purple" />
              <span className="font-display font-bold">ChatSphere</span>
            </Link>
            <h1 className="font-display font-bold text-3xl text-white mt-4">Create account</h1>
            <p className="text-gray-500 mt-2">Join the thinking revolution</p>
          </div>

          {/* Google Sign-in */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-gray-800 font-medium hover:bg-gray-100 transition-colors active:scale-[0.98] mb-5"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </motion.button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-navy-700/50"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-navy-900 text-gray-500 uppercase tracking-wider">or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="thinker_42"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-800 border border-navy-700/50 text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors"
                  minLength={3}
                  maxLength={30}
                  required
                />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-800 border border-navy-700/50 text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors"
                  required
                />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 rounded-xl bg-navy-800 border border-navy-700/50 text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength.score ? strengthColor : 'bg-navy-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {passwordStrength.checks.map(({ label, met }) => (
                      <div key={label} className="flex items-center gap-1.5 text-[10px]">
                        {met ? (
                          <Check size={10} className="text-green-500" />
                        ) : (
                          <X size={10} className="text-gray-600" />
                        )}
                        <span className={met ? 'text-green-400' : 'text-gray-600'}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl bg-navy-800 border text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-500/50'
                      : confirmPassword && confirmPassword === password
                      ? 'border-green-500/50'
                      : 'border-navy-700/50'
                  }`}
                  required
                />
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-400 mt-1">Passwords don&apos;t match</p>
              )}
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? 'Creating account...' : 'Create Account ✦'}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-neon-purple hover:text-purple-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
