import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userId = searchParams.get('userId');
    const username = searchParams.get('username');
    const email = searchParams.get('email');
    const displayName = searchParams.get('displayName');
    const avatar = searchParams.get('avatar');
    const authProvider = searchParams.get('authProvider');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login');
      return;
    }

    if (accessToken && refreshToken && userId && username && email) {
      login(
        {
          id: userId,
          username,
          email,
          displayName: displayName || username,
          avatar: avatar || '',
          authProvider: authProvider || 'google',
          createdAt: new Date().toISOString(),
        },
        accessToken,
        refreshToken
      );
      toast.success(`Welcome, ${displayName || username}! 🎉`);
      navigate('/chat');
    } else {
      toast.error('Authentication failed — missing credentials');
      navigate('/login');
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
          <Sparkles size={28} className="text-white" />
        </div>
        <h2 className="font-display text-xl text-white mb-2">Signing you in...</h2>
        <p className="text-gray-500 text-sm">Connecting with Google</p>
      </motion.div>
    </div>
  );
}
