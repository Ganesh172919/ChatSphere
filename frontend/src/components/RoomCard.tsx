import { motion } from 'framer-motion';
import { ArrowRight, Globe, Loader2, Lock, MessageSquare, Users } from 'lucide-react';
import type { RoomVisibility } from '../api/rooms';

interface Props {
  id: string;
  name: string;
  description: string;
  tags: string[];
  messageCount: number;
  memberCount?: number;
  visibility: RoomVisibility;
  isMember?: boolean;
  isJoining?: boolean;
  onJoin: (id: string, isMember: boolean) => void;
  index?: number;
}

export default function RoomCard({
  id,
  name,
  description,
  tags,
  messageCount,
  memberCount = 0,
  visibility,
  isMember = false,
  isJoining = false,
  onJoin,
  index = 0,
}: Props) {
  const isPrivate = visibility === 'private';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="group relative bg-navy-800 rounded-2xl border border-navy-700/50 overflow-hidden hover:border-neon-purple/30 transition-all duration-300 cursor-pointer"
      onClick={() => onJoin(id, isMember)}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 mr-2">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-display font-bold text-lg text-white group-hover:text-neon-purple transition-colors truncate">
                {name}
              </h3>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                isPrivate
                  ? 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
                  : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
              }`}>
                {isPrivate ? <Lock size={10} /> : <Globe size={10} />}
                {isPrivate ? 'Private' : 'Public'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-500 flex-shrink-0">
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span className="text-xs">{memberCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare size={12} />
              <span className="text-xs">{messageCount}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 line-clamp-2 mb-4 leading-relaxed">
          {description || 'No description provided'}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-navy-700 text-gray-400 border border-navy-600/50"
              >
                #{tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] text-gray-500">
                +{tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-navy-700/50">
          <div className="flex items-center gap-1.5 text-gray-500">
            {isPrivate ? <Lock size={14} /> : <Users size={14} />}
            <span className="text-xs">
              {isMember ? 'You are a member' : isPrivate ? 'Requires room key' : 'Anyone can join'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-neon-purple text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            {isJoining ? <Loader2 size={12} className="animate-spin" /> : null}
            {isMember ? 'Open' : isPrivate ? 'Enter key' : 'Join'} <ArrowRight size={12} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
