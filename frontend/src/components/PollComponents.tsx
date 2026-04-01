import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Plus, X, Clock, Lock, Users, Eye, EyeOff, Check } from 'lucide-react';
import { createPoll } from '../api/polls';
import type { Poll } from '../api/polls';
import toast from 'react-hot-toast';

interface CreatePollProps {
  roomId: string;
  onCreated: (poll: Poll) => void;
  onClose: () => void;
}

export function CreatePollModal({ roomId, onCreated, onClose }: CreatePollProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      toast.error('Question is required');
      return;
    }
    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast.error('At least 2 options are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const poll = await createPoll({
        roomId,
        question: question.trim(),
        options: validOptions,
        allowMultipleVotes: allowMultiple,
        isAnonymous,
        expiresInMinutes: expiresIn || undefined,
      });
      onCreated(poll);
      toast.success('Poll created!');
      onClose();
    } catch {
      toast.error('Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-navy-800 rounded-2xl border border-navy-700/50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center">
              <BarChart3 size={16} className="text-white" />
            </div>
            <h2 className="font-display font-semibold text-white">Create Poll</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do you want to ask?"
              className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-navy-700/50 text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors text-sm"
              maxLength={500}
              autoFocus
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Options</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-5 text-center flex-shrink-0">{i + 1}</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 px-3 py-2 rounded-lg bg-navy-900 border border-navy-700/50 text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors text-sm"
                    maxLength={200}
                  />
                  {options.length > 2 && (
                    <button onClick={() => removeOption(i)} className="p-1 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                onClick={addOption}
                className="mt-2 flex items-center gap-1.5 text-xs text-neon-purple hover:text-purple-300 transition-colors"
              >
                <Plus size={12} />
                Add option
              </button>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-3 pt-2 border-t border-navy-700/30">
            <button
              onClick={() => setAllowMultiple(!allowMultiple)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all ${
                allowMultiple ? 'border-neon-purple/40 bg-neon-purple/5' : 'border-navy-700/30 bg-navy-900/30'
              }`}
            >
              <Users size={14} className={allowMultiple ? 'text-neon-purple' : 'text-gray-500'} />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-300">Allow multiple votes</p>
                <p className="text-[10px] text-gray-600">Users can vote for more than one option</p>
              </div>
              {allowMultiple && <Check size={14} className="text-neon-purple" />}
            </button>

            <button
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all ${
                isAnonymous ? 'border-neon-purple/40 bg-neon-purple/5' : 'border-navy-700/30 bg-navy-900/30'
              }`}
            >
              {isAnonymous ? <EyeOff size={14} className="text-neon-purple" /> : <Eye size={14} className="text-gray-500" />}
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-300">Anonymous voting</p>
                <p className="text-[10px] text-gray-600">Voters won&apos;t be visible to others</p>
              </div>
              {isAnonymous && <Check size={14} className="text-neon-purple" />}
            </button>

            <div className="flex items-center gap-3 p-3 rounded-xl border border-navy-700/30 bg-navy-900/30">
              <Clock size={14} className="text-gray-500" />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-300">Time limit</p>
              </div>
              <select
                value={expiresIn || ''}
                onChange={(e) => setExpiresIn(e.target.value ? Number(e.target.value) : null)}
                className="px-2 py-1 rounded-lg bg-navy-800 border border-navy-700/50 text-xs text-gray-300"
              >
                <option value="">No limit</option>
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="1440">24 hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-navy-700/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-navy-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-neon-purple to-neon-blue text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? 'Creating...' : 'Create Poll'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Poll Card — displays a poll with voting UI
interface PollCardProps {
  poll: Poll;
  currentUserId: string;
  onVote: (pollId: string, optionIndex: number) => void;
  onClose?: (pollId: string) => void;
}

export function PollCard({ poll, currentUserId, onVote, onClose }: PollCardProps) {
  const isCreator = poll.creatorId === currentUserId;
  const isActive = !poll.isClosed && !poll.isExpired;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto my-3 bg-navy-800 rounded-2xl border border-navy-700/50 overflow-hidden"
    >
      {/* Poll header */}
      <div className="px-4 py-3 bg-gradient-to-r from-neon-purple/10 to-neon-blue/10 border-b border-navy-700/30">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-neon-purple" />
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Poll</span>
          {!isActive && (
            <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-semibold bg-red-500/20 text-red-400">
              {poll.isClosed ? 'Closed' : 'Expired'}
            </span>
          )}
          {poll.isAnonymous && (
            <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-semibold bg-navy-700 text-gray-400">
              <Lock size={8} className="inline mr-1" />Anonymous
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-white mt-1">{poll.question}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">
          by {poll.creatorUsername} · {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Options */}
      <div className="px-4 py-3 space-y-2">
        {poll.options.map((opt) => (
          <button
            key={opt.index}
            onClick={() => isActive && onVote(poll.id, opt.index)}
            disabled={!isActive}
            className={`relative w-full text-left p-3 rounded-xl border transition-all overflow-hidden ${
              opt.hasVoted
                ? 'border-neon-purple/40 bg-neon-purple/5'
                : isActive
                  ? 'border-navy-700/50 hover:border-navy-600 bg-navy-900/30'
                  : 'border-navy-700/30 bg-navy-900/20 cursor-default'
            }`}
          >
            {/* Progress bar */}
            <div
              className={`absolute inset-y-0 left-0 transition-all ${
                opt.hasVoted ? 'bg-neon-purple/10' : 'bg-navy-700/20'
              }`}
              style={{ width: `${opt.percentage}%` }}
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                {opt.hasVoted && <Check size={12} className="text-neon-purple" />}
                <span className="text-sm text-gray-300">{opt.text}</span>
              </div>
              <span className={`text-xs font-medium ${opt.hasVoted ? 'text-neon-purple' : 'text-gray-500'}`}>
                {opt.percentage}%
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      {isCreator && isActive && onClose && (
        <div className="px-4 py-2 border-t border-navy-700/30">
          <button
            onClick={() => onClose(poll.id)}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Close poll
          </button>
        </div>
      )}
    </motion.div>
  );
}
