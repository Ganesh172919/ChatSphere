import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Flag, AlertTriangle } from 'lucide-react';
import { reportUser, reportMessage } from '../api/moderation';
import toast from 'react-hot-toast';

const REASONS = [
  { value: 'spam', label: 'Spam', icon: '📩' },
  { value: 'harassment', label: 'Harassment', icon: '😤' },
  { value: 'hate_speech', label: 'Hate Speech', icon: '🚫' },
  { value: 'inappropriate_content', label: 'Inappropriate Content', icon: '⚠️' },
  { value: 'impersonation', label: 'Impersonation', icon: '🎭' },
  { value: 'other', label: 'Other', icon: '📝' },
];

interface Props {
  targetId: string;
  targetType: 'user' | 'message';
  targetName?: string;
  roomId?: string;
  onClose: () => void;
}

export default function ReportModal({ targetId, targetType, targetName, roomId, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const fn = targetType === 'user' ? reportUser : reportMessage;
      const result = await fn({
        targetId,
        reason,
        description: description.trim(),
        roomId,
      });
      toast.success(result.message);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit report');
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
        className="w-full max-w-md bg-navy-800 rounded-2xl border border-navy-700/50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Flag size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-white">
                Report {targetType === 'user' ? 'User' : 'Message'}
              </h2>
              {targetName && (
                <p className="text-[10px] text-gray-500">Reporting: {targetName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Reason selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-all ${
                    reason === r.value
                      ? 'border-red-500/40 bg-red-500/10 text-red-300'
                      : 'border-navy-700/50 bg-navy-900/30 text-gray-400 hover:border-navy-600'
                  }`}
                >
                  <span>{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Details <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional details..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-navy-700/50 text-white placeholder-gray-600 focus:border-red-500/50 transition-colors text-sm resize-none"
              maxLength={1000}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-300/80">
              False reports may result in action against your account. Only report genuine violations.
            </p>
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
            disabled={!reason || isSubmitting}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-lg hover:shadow-red-500/20 transition-all disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
