import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Hash, Lock, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { RoomVisibility } from '../api/rooms';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, tags: string[], maxUsers: number, visibility: RoomVisibility) => void;
}

export default function CreateRoomModal({ isOpen, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [maxUsers, setMaxUsers] = useState(20);
  const [visibility, setVisibility] = useState<RoomVisibility>('public');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Room name is required');
      return;
    }

    if (name.length > 50) {
      toast.error('Room name must be under 50 characters');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onCreate(name.trim(), description.trim(), tags, maxUsers, visibility);
    setName('');
    setDescription('');
    setTagsInput('');
    setMaxUsers(20);
    setVisibility('public');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-navy-800 rounded-2xl border border-navy-700/50 w-full max-w-lg shadow-2xl shadow-black/50">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-navy-700/50">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-neon-purple" />
                  <h2 className="font-display font-bold text-xl text-white">Create Room</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-navy-700 text-gray-400 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Room Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Deep Learning Discussions"
                    className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-navy-600/50 text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors"
                    maxLength={50}
                  />
                  <p className="text-[10px] text-gray-600 mt-1 text-right">{name.length}/50</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this room about?"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-navy-600/50 text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-1.5">
                    <Hash size={14} /> Tags
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="ai, coding, math (comma-separated)"
                    className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-navy-600/50 text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Room Privacy</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVisibility('public')}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        visibility === 'public'
                          ? 'border-neon-blue/50 bg-neon-blue/10 text-white'
                          : 'border-navy-600/50 bg-navy-900 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Globe size={14} />
                        Public
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">Anyone can join directly.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility('private')}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        visibility === 'private'
                          ? 'border-neon-purple/50 bg-neon-purple/10 text-white'
                          : 'border-navy-600/50 bg-navy-900 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Lock size={14} />
                        Private
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">A join key is generated for members.</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Max Users: {maxUsers}
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={100}
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(Number(e.target.value))}
                    className="w-full accent-neon-purple"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>2</span>
                    <span>100</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all active:scale-[0.98]"
                >
                  Create Room ✦
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
