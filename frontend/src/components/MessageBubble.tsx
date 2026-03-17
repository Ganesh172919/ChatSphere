import { useState } from 'react';
import { motion } from 'framer-motion';
import { Reply, ThumbsUp, Flame, Brain, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface Props {
  id?: string;
  role: 'user' | 'assistant' | 'group-user' | 'ai';
  content: string;
  timestamp: string;
  username?: string;
  userId?: string;
  currentUserId?: string;
  isAI?: boolean;
  triggeredBy?: string;
  reactions?: Record<string, string[]>;
  replyTo?: { id: string; username: string; content: string } | null;
  onReply?: () => void;
  onReaction?: (emoji: string) => void;
  showReactions?: boolean;
  index?: number;
}

const REACTION_EMOJIS = [
  { emoji: '👍', icon: ThumbsUp },
  { emoji: '🔥', icon: Flame },
  { emoji: '🤯', icon: Brain },
  { emoji: '💡', icon: Lightbulb },
];

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(userId: string): string {
  const colors = [
    'from-pink-500 to-rose-500',
    'from-violet-500 to-purple-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-red-500 to-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function MessageBubble({
  role, content, timestamp, username, userId, currentUserId,
  isAI, triggeredBy, reactions, replyTo, onReply, onReaction,
  showReactions = false, index = 0,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isUser = role === 'user' || (role === 'group-user' && userId === currentUserId);
  const isAssistant = role === 'assistant' || isAI;
  const words = wordCount(content);
  const isLong = words > 400;
  const displayContent = isLong && !isExpanded ? content.slice(0, 1500) + '...' : content;

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const reactionData: Reaction[] = reactions
    ? REACTION_EMOJIS.map(({ emoji }) => ({
        emoji,
        count: reactions[emoji]?.length || 0,
        hasReacted: reactions[emoji]?.includes(currentUserId || '') || false,
      }))
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`flex gap-3 px-4 py-2 group ${isUser && !showReactions ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {!isUser || showReactions ? (
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
            isAI
              ? 'bg-gradient-to-br from-neon-purple to-neon-blue animate-pulse-glow'
              : `bg-gradient-to-br ${getAvatarColor(userId || 'user')}`
          }`}
        >
          {isAI ? 'GX' : getInitials(username || 'U')}
        </div>
      ) : null}

      {/* Content */}
      <div className={`max-w-[75%] min-w-0 ${isUser && !showReactions ? 'items-end' : ''}`}>
        {/* Reply reference */}
        {replyTo && (
          <div className="text-xs text-gray-500 mb-1 pl-3 border-l-2 border-navy-500 truncate">
            ↩ <span className="font-medium text-gray-400">{replyTo.username}</span>: {replyTo.content}
          </div>
        )}

        {/* Username + timestamp for group */}
        {showReactions && !isAI && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-gray-300">{username}</span>
            <span className="text-[10px] text-gray-600">{formatTime(timestamp)}</span>
          </div>
        )}

        {isAI && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold bg-gradient-to-r from-neon-purple to-neon-blue bg-clip-text text-transparent">
              AI · GeminiX
            </span>
            {triggeredBy && (
              <span className="text-[10px] text-gray-600">triggered by {triggeredBy}</span>
            )}
            <span className="text-[10px] text-gray-600">{formatTime(timestamp)}</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isAI
              ? 'bg-navy-700/60 border-l-2 border-neon-purple/60'
              : isUser && !showReactions
              ? 'bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 border border-neon-purple/20'
              : isAssistant
              ? 'bg-navy-700/40 border border-navy-600/30'
              : 'bg-navy-700/30 border border-navy-700/40'
          }`}
        >
          {isAssistant || isAI ? (
            <MarkdownRenderer content={displayContent} />
          ) : (
            <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{content}</p>
          )}

          {/* Show more/less */}
          {isLong && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 mt-2 text-xs text-neon-purple hover:text-purple-300 transition-colors"
            >
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {isExpanded ? 'Show less' : 'Show full response'}
            </button>
          )}
        </div>

        {/* Meta info (word count for AI) */}
        <div className="flex items-center gap-3 mt-1 px-1">
          {(isAssistant || isAI) && (
            <span className="text-[10px] text-gray-600">{words} words</span>
          )}
          {!showReactions && !isAssistant && (
            <span className="text-[10px] text-gray-600">{formatTime(timestamp)}</span>
          )}
        </div>

        {/* Reactions */}
        {showReactions && (
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {reactionData.filter(r => r.count > 0).map(({ emoji, count, hasReacted }) => (
              <button
                key={emoji}
                onClick={() => onReaction?.(emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                  hasReacted
                    ? 'border-neon-purple/40 bg-neon-purple/10 text-white'
                    : 'border-navy-600/50 bg-navy-700/30 text-gray-400 hover:border-navy-500'
                }`}
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            ))}

            {/* Add reaction / Reply (show on hover) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {REACTION_EMOJIS.map(({ emoji }) => (
                <button
                  key={emoji}
                  onClick={() => onReaction?.(emoji)}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-navy-600 text-sm transition-colors"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
              {onReply && (
                <button
                  onClick={onReply}
                  className="p-1 rounded hover:bg-navy-600 text-gray-500 hover:text-gray-300 transition-colors"
                  title="Reply"
                >
                  <Reply size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
