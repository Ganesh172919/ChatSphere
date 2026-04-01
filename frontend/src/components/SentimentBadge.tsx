import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  sentiment: string;
  emoji: string;
  confidence: number;
}

const SENTIMENT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  positive: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  negative: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  neutral: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
  excited: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  confused: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  angry: { bg: 'bg-red-600/10', text: 'text-red-500', border: 'border-red-600/30' },
};

export default function SentimentBadge({ sentiment, emoji, confidence }: Props) {
  const style = SENTIMENT_STYLES[sentiment] || SENTIMENT_STYLES.neutral;

  return (
    <AnimatePresence>
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${style.bg} ${style.text} ${style.border}`}
        title={`${sentiment} (${Math.round(confidence * 100)}% confidence)`}
      >
        <span>{emoji}</span>
        <span className="capitalize">{sentiment}</span>
      </motion.span>
    </AnimatePresence>
  );
}
