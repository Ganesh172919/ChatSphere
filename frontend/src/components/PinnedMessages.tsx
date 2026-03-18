import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, X, Sparkles, MessageSquare } from 'lucide-react';
import { getPinnedMessages } from '../api/users';
import type { PinnedMessage } from '../api/users';

interface Props {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  onUnpin?: (messageId: string) => void;
}

export default function PinnedMessages({ roomId, isOpen, onClose, onUnpin }: Props) {
  const [pinned, setPinned] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !roomId) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getPinnedMessages(roomId);
        setPinned(data);
      } catch (err) {
        console.error('Failed to load pinned messages:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, roomId]);

  // Listen for real-time pin/unpin updates
  const handleUnpin = (messageId: string) => {
    setPinned((prev) => prev.filter((m) => m.id !== messageId));
    onUnpin?.(messageId);
  };

  const formatDate = (ts: string) => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="w-80 border-l border-navy-700/50 bg-navy-800 flex flex-col h-full"
        >
          {/* Header */}
          <div className="p-4 border-b border-navy-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pin size={16} className="text-neon-purple" />
              <h3 className="font-display font-semibold text-white text-sm">Pinned Messages</h3>
              <span className="px-1.5 py-0.5 rounded-full bg-neon-purple/20 text-neon-purple text-[10px] font-bold">
                {pinned.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-navy-700 transition-all"
              aria-label="Close pinned messages"
            >
              <X size={16} />
            </button>
          </div>

          {/* Pinned list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-navy-700 animate-pulse" />
                ))}
              </div>
            ) : pinned.length === 0 ? (
              <div className="text-center py-12">
                <Pin size={28} className="text-navy-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No pinned messages</p>
                <p className="text-gray-600 text-xs mt-1">Pin important messages to find them here</p>
              </div>
            ) : (
              pinned.map((msg) => (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 rounded-xl bg-navy-700/50 border border-navy-600/30 hover:border-navy-600/60 transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${
                      msg.isAI
                        ? 'bg-gradient-to-br from-neon-purple to-neon-blue text-white'
                        : 'bg-navy-600 text-gray-400'
                    }`}>
                      {msg.isAI ? <Sparkles size={10} /> : <MessageSquare size={10} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-gray-300">{msg.username}</span>
                        <span className="text-[10px] text-gray-600">{formatDate(msg.timestamp)}</span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">{msg.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-600">
                          Pinned by {msg.pinnedBy}
                        </span>
                        <button
                          onClick={() => handleUnpin(msg.id)}
                          className="text-[10px] text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Unpin
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
