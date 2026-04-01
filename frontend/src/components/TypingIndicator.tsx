import { motion } from 'framer-motion';

const thinkingTexts = ['Reasoning...', 'Analyzing...', 'Formulating...'];

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-3 px-4 py-3"
    >
      {/* AI Avatar */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 animate-pulse-glow">
        GX
      </div>

      <div className="flex items-center gap-3 bg-navy-700/50 px-4 py-3 rounded-2xl border border-navy-600/30">
        {/* Dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-neon-purple"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>

        {/* Cycling text */}
        <motion.span
          className="text-sm text-gray-400"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {thinkingTexts[Math.floor(Date.now() / 2000) % thinkingTexts.length]}
        </motion.span>
      </div>
    </motion.div>
  );
}
