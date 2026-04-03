import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageSquare, Users, Brain, Zap, Shield, Globe } from 'lucide-react';
import Navbar from '../components/Navbar';

const features = [
  {
    icon: Brain,
    title: 'Deep Reasoning',
    description: 'A reasoning engine that breaks down problems, challenges assumptions, and thinks in multiple dimensions.',
  },
  {
    icon: MessageSquare,
    title: 'Solo AI Chat',
    description: 'Private conversations with full markdown, code highlighting, and persistent history saved to MongoDB.',
  },
  {
    icon: Users,
    title: 'Group Rooms',
    description: 'Create or join rooms and collaborate with AI.',
  },
  {
    icon: Zap,
    title: 'Real-time',
    description: 'Instant messaging with live updates.',
  },
  {
    icon: Shield,
    title: 'Secure Auth',
    description: 'JWT + Google OAuth authentication.',
  },
  {
    icon: Globe,
    title: 'Cloud Storage',
    description: 'All chats stored securely.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <Navbar />

      {/* Hero */}
      <main className="relative pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        
        <div className="flex flex-col lg:flex-row items-center gap-12">
          
          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1"
          >
            <div className="text-sm text-gray-400 mb-6">
              Powered by Google Gemini
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight">
              Think deeper.
              <br />
              <span className="text-gray-400">Chat smarter.</span>
            </h1>

            <p className="mt-6 text-gray-400 max-w-xl">
              A high-reasoning AI chat app with solo chat, group rooms, and real-time collaboration.
            </p>

            <div className="flex gap-4 mt-8">
              <Link to="/register" className="px-6 py-3 bg-white text-black rounded-lg font-medium">
                Get Started
              </Link>
              <Link to="/login" className="px-6 py-3 border border-gray-700 text-gray-300 rounded-lg">
                Sign In
              </Link>
            </div>

            <div className="mt-6 h-10"></div>
          </motion.div>

          {/* RIGHT IMAGE */}
          <div className="flex-1">
            <img
              src="https://i.pinimg.com/736x/c3/75/ba/c375ba0a4c9f8a3dde5b51ce99e6de7b.jpg"
              className="w-full max-w-md mx-auto rounded-lg"
            />
          </div>
        </div>

        {/* FEATURES */}
        <div className="mt-24">
          <h2 className="text-2xl text-white font-semibold mb-8 text-center">
            Features
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="p-5 border border-gray-800 rounded-xl bg-black/40"
              >
                <f.icon className="mb-3 text-gray-300" size={20} />
                <h3 className="text-white font-medium mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="mt-24 text-center">
          <h2 className="text-2xl text-white font-semibold mb-10">
            How it works
          </h2>

          <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: '01', title: 'Sign Up', desc: 'Create account quickly' },
              { step: '02', title: 'Start Chat', desc: 'Ask anything' },
              { step: '03', title: 'Collaborate', desc: 'Use group rooms' },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-gray-700 text-3xl mb-2">{item.step}</div>
                <h3 className="text-white font-medium">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="text-center py-10 border-t border-gray-900">
        <p className="text-xs text-gray-600">
          ChatSphere {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
