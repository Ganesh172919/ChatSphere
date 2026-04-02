import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { exchangeGoogleCode } from '../api/auth';
import { useAuthStore } from '../store/authStore';

const googleExchangeRequests = new Map<string, ReturnType<typeof exchangeGoogleCode>>();

function getGoogleExchangeRequest(code: string) {
  if (!googleExchangeRequests.has(code)) {
    googleExchangeRequests.set(code, exchangeGoogleCode(code));
  }

  return googleExchangeRequests.get(code)!;
}

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    let isActive = true;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login', { replace: true });
      return;
    }

    if (!code) {
      toast.error('Authentication failed because the Google login code is missing.');
      navigate('/login', { replace: true });
      return;
    }

    const completeGoogleLogin = async () => {
      try {
        const data = await getGoogleExchangeRequest(code);
        if (!isActive) {
          return;
        }

        login(data.user, data.accessToken);
        toast.success(`Welcome, ${data.user.displayName || data.user.username}!`);
        navigate('/dashboard', { replace: true });
      } catch {
        if (!isActive) {
          return;
        }

        toast.error('Google sign-in could not be completed.');
        navigate('/login?error=google_exchange_failed', { replace: true });
      }
    };

    completeGoogleLogin();

    return () => {
      isActive = false;
    };
  }, [login, navigate, searchParams]);

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
        <p className="text-gray-500 text-sm">Completing Google sign-in securely</p>
      </motion.div>
    </div>
  );
}
