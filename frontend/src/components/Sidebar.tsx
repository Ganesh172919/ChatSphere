import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, MessageSquare, ChevronLeft } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import type { Conversation } from '../store/chatStore';

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onDeleteConversation: (conversationId: string) => void;
}

export default function Sidebar({ isOpen, onToggle, onNewChat, onDeleteConversation }: Props) {
  const { conversations, activeConversationId, setActiveConversation } = useChatStore();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        className="fixed left-0 top-16 bottom-0 w-72 bg-navy-800 border-r border-navy-700/50 z-40 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-navy-700/50">
          <h2 className="font-display font-semibold text-sm text-gray-300 uppercase tracking-wider">
            Chat History
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewChat}
              className="p-2 rounded-lg bg-gradient-to-r from-neon-purple to-neon-blue text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all"
              title="New chat (Ctrl+K)"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={onToggle}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-navy-700 transition-all lg:hidden"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-10 h-10 text-navy-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No conversations yet</p>
              <p className="text-xs text-gray-600 mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map((conv: Conversation, index: number) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setActiveConversation(conv.id)}
                className={`w-full text-left p-3 rounded-lg group transition-all flex items-start gap-3 cursor-pointer ${
                  activeConversationId === conv.id
                    ? 'bg-navy-700 border border-neon-purple/30 shadow-sm'
                    : 'hover:bg-navy-700/50 border border-transparent'
                }`}
              >
                <MessageSquare
                  size={14}
                  className={`mt-0.5 flex-shrink-0 ${
                    activeConversationId === conv.id ? 'text-neon-purple' : 'text-gray-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate font-medium">{conv.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(conv.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="p-1 rounded text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 cursor-pointer"
                  title="Delete conversation"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-navy-700/50">
          <p className="text-[10px] text-gray-600 text-center">
            ✦ built with ☕ + gemini
          </p>
        </div>
      </motion.aside>
    </>
  );
}
