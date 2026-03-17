import { motion } from 'framer-motion';
import { Users, MessageSquare, ArrowRight } from 'lucide-react';

interface Props {
  id: string;
  name: string;
  description: string;
  tags: string[];
  messageCount: number;
  onJoin: (id: string) => void;
  index?: number;
}

export default function RoomCard({ id, name, description, tags, messageCount, onJoin, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="group relative bg-navy-800 rounded-2xl border border-navy-700/50 overflow-hidden hover:border-neon-purple/30 transition-all duration-300 cursor-pointer"
      onClick={() => onJoin(id)}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display font-bold text-lg text-white group-hover:text-neon-purple transition-colors truncate mr-2">
            {name}
          </h3>
          <div className="flex items-center gap-1 text-gray-500 flex-shrink-0">
            <MessageSquare size={12} />
            <span className="text-xs">{messageCount}</span>
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
            <Users size={14} />
            <span className="text-xs">Active room</span>
          </div>
          <div className="flex items-center gap-1.5 text-neon-purple text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Join <ArrowRight size={12} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
