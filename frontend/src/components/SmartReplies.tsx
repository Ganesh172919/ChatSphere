import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';
import { getSmartReplies } from '../api/ai';

interface Props {
  messages: Array<{ username?: string; role?: string; content: string }>;
  context?: string;
  onSelect: (reply: string) => void;
  enabled?: boolean;
}

export default function SmartReplies({ messages, context, onSelect, enabled = true }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const fetchSuggestions = async () => {
    if (!enabled || messages.length === 0) return;
    setIsLoading(true);
    try {
      const result = await getSmartReplies(messages, context);
      setSuggestions(result.suggestions);
      setIsVisible(true);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch when the last message changes
  useEffect(() => {
    if (!enabled || messages.length === 0) {
      setIsVisible(false);
      return;
    }

    const lastMsg = messages[messages.length - 1];
    // Only suggest replies for non-self messages
    if (lastMsg.role === 'user') {
      setIsVisible(false);
      return;
    }

    const timeout = setTimeout(fetchSuggestions, 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, enabled]);

  const handleSelect = (reply: string) => {
    onSelect(reply);
    setIsVisible(false);
  };

  if (!enabled || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: 10, height: 0 }}
        className="px-4 py-2"
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-neon-purple" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
              Quick replies
            </span>
            <button
              onClick={fetchSuggestions}
              disabled={isLoading}
              className="p-0.5 rounded text-gray-600 hover:text-gray-400 transition-colors"
              aria-label="Refresh suggestions"
            >
              <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {isLoading ? (
              <>
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-8 w-24 rounded-full bg-navy-700 animate-pulse" />
                ))}
              </>
            ) : (
              suggestions.map((suggestion, i) => (
                <motion.button
                  key={`${suggestion}-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => handleSelect(suggestion)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-navy-600/50 bg-navy-800 text-gray-300 hover:border-neon-purple/40 hover:text-white hover:bg-navy-700 transition-all active:scale-95"
                >
                  {suggestion}
                </motion.button>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
