import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, MessageSquare, Users, Brain, ArrowRight, Zap, Shield, Globe } from 'lucide-react';
import Navbar from '../components/Navbar';

const features = [
  {
    icon: Brain,
    title: 'Deep Reasoning',
    description: 'A reasoning engine that breaks down problems, challenges assumptions, and thinks in multiple dimensions.',
    color: 'from-neon-purple to-violet-600',
  },
  {
    icon: MessageSquare,
    title: 'Solo AI Chat',
    description: 'Private conversations with full markdown, code highlighting, and persistent history saved to MongoDB.',
    color: 'from-neon-blue to-cyan-500',
  },
  {
    icon: Users,
    title: 'Group Rooms',
    description: 'Create or join rooms, chat with others, and summon AI with @ai for collaborative reasoning sessions.',
    color: 'from-neon-coral to-amber-500',
  },
  {
    icon: Zap,
    title: 'Real-time',
    description: 'Socket.IO powered instant messaging with reactions, threaded replies, and live user presence.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Shield,
    title: 'Secure Auth',
    description: 'JWT access + refresh tokens with Google OAuth sign-in. Your data stays yours.',
    color: 'from-rose-500 to-pink-500',
  },
  {
    icon: Globe,
    title: 'MongoDB Atlas',
    description: 'Cloud-native database. Conversations, rooms, and messages persist across sessions.',
    color: 'from-indigo-500 to-blue-600',
  },
];

const stats = [
  { value: 'Gemini 1.5', label: 'AI Model' },
  { value: 'Realtime', label: 'WebSocket' },
  { value: 'OAuth2', label: 'Google Auth' },
  { value: '∞', label: 'Conversations' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-navy-900 relative overflow-hidden">
      <Navbar />

      {/* Floating orbs */}
      <div className="orb w-[500px] h-[500px] bg-neon-purple/20 -top-20 -left-60 animate-float" />
      <div className="orb w-[400px] h-[400px] bg-neon-blue/15 top-[600px] -right-40 animate-float" style={{ animationDelay: '2s' }} />
      <div className="orb w-[300px] h-[300px] bg-neon-coral/10 bottom-40 left-1/4 animate-float" style={{ animationDelay: '4s' }} />

      {/* Hero */}
      <main className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-left max-w-3xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-navy-800 border border-navy-700/50 text-sm text-gray-400 mb-8"
          >
            <Sparkles size={14} className="text-neon-purple" />
            Powered by Google Gemini · MongoDB Atlas
          </motion.div>

          <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.1] tracking-tight">
            <span className="text-white">Think deeper.</span>
            <br />
            <span className="bg-gradient-to-r from-neon-purple via-neon-blue to-neon-coral bg-clip-text text-transparent">
              Chat smarter.
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-lg text-gray-400 max-w-xl leading-relaxed"
          >
            A high-reasoning AI chat app that doesn&apos;t give you shallow answers.
            Solo conversations, group rooms with @ai mentions, real-time collaboration, Google sign-in, and cloud-persistent chat history.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 mt-10"
          >
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white font-semibold text-lg hover:shadow-2xl hover:shadow-purple-500/30 transition-all active:scale-[0.98]"
            >
              Start Thinking <ArrowRight size={20} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-navy-800 border border-navy-700/50 text-gray-300 font-medium text-lg hover:border-neon-purple/30 hover:text-white transition-all"
            >
              Sign In
            </Link>
          </motion.div>

          {/* Keyboard shortcut hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6 text-xs text-gray-600 flex items-center gap-2"
          >
            <kbd className="px-1.5 py-0.5 rounded bg-navy-700 text-gray-500 text-[10px] font-mono border border-navy-600">⌘ K</kbd>
            to start a new chat once inside
          </motion.p>
        </motion.div>

        {/* Animated stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 + i * 0.1 }}
              className="text-center p-4 rounded-2xl bg-navy-800/40 border border-navy-700/30 backdrop-blur-sm"
            >
              <p className="font-display font-bold text-xl bg-gradient-to-r from-neon-purple to-neon-blue bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="mt-20"
        >
          <h2 className="font-display font-bold text-2xl text-white mb-2 text-center">
            Everything you need to think better
          </h2>
          <p className="text-gray-500 text-sm text-center mb-10 max-w-md mx-auto">
            Built by students who wanted more than shallow chatbot answers
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + i * 0.08 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="p-6 rounded-2xl bg-navy-800/60 border border-navy-700/40 hover:border-navy-600/60 transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow`}>
                  <feature.icon size={18} className="text-white" />
                </div>
                <h3 className="font-display font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-28 text-center"
        >
          <h2 className="font-display font-bold text-2xl text-white mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: '01', title: 'Sign Up', desc: 'Create an account or sign in with Google — takes 10 seconds.' },
              { step: '02', title: 'Ask Anything', desc: 'Solo chat for deep 1-on-1 reasoning, or create a group room.' },
              { step: '03', title: 'Think Together', desc: 'Mention @ai in group rooms to bring Gemini into the conversation.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 + i * 0.15 }}
                className="relative"
              >
                <span className="font-display font-bold text-4xl bg-gradient-to-b from-neon-purple/30 to-transparent bg-clip-text text-transparent">
                  {item.step}
                </span>
                <h3 className="font-display font-bold text-white mt-2 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative text-center py-10 border-t border-navy-800">
        <p className="text-xs text-gray-600">
          ✦ built with ☕ + gemini · ChatSphere {new Date().getFullYear()}
        </p>
        <p className="text-[10px] text-gray-700 mt-2">
          React · TypeScript · Node.js · MongoDB · Socket.IO · Gemini 1.5 Flash
        </p>
      </footer>
    </div>
  );
}
