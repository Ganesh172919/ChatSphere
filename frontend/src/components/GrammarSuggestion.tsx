import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpellCheck, X, Check } from 'lucide-react';
import { checkGrammar } from '../api/ai';

interface Props {
  text: string;
  onAccept: (corrected: string) => void;
  enabled?: boolean;
  modelId?: string;
}

export default function GrammarSuggestion({ text, onAccept, enabled = false, modelId }: Props) {
  const [suggestion, setSuggestion] = useState<{
    corrected: string | null;
    suggestions: string[];
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    if (!enabled || !text || text.trim().length < 10 || isChecking) return;
    setIsChecking(true);
    setDismissed(false);
    try {
      const result = await checkGrammar(text, modelId);
      if (result.corrected && result.corrected !== text) {
        setSuggestion(result);
      } else {
        setSuggestion(null);
      }
    } catch {
      setSuggestion(null);
    } finally {
      setIsChecking(false);
    }
  }, [text, enabled, isChecking, modelId]);

  const handleAccept = () => {
    if (suggestion?.corrected) {
      onAccept(suggestion.corrected);
      setSuggestion(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setSuggestion(null);
  };

  if (!enabled) return null;

  return (
    <div className="relative">
      {/* Check button */}
      {text.trim().length >= 10 && !suggestion && !dismissed && (
        <button
          onClick={check}
          disabled={isChecking}
          className="absolute -top-8 right-2 p-1.5 rounded-lg text-gray-500 hover:text-neon-purple hover:bg-navy-700/50 transition-all text-[10px] flex items-center gap-1"
          aria-label="Check grammar"
        >
          <SpellCheck size={12} className={isChecking ? 'animate-pulse' : ''} />
          {isChecking ? 'Checking...' : 'Grammar'}
        </button>
      )}

      {/* Suggestion bar */}
      <AnimatePresence>
        {suggestion?.corrected && !dismissed && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/20"
          >
            <SpellCheck size={14} className="text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-300 truncate">
                Suggestion: <span className="text-white font-medium">{suggestion.corrected}</span>
              </p>
              {suggestion.suggestions.length > 0 && (
                <p className="text-[10px] text-gray-500 truncate">{suggestion.suggestions[0]}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleAccept}
                className="p-1 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                aria-label="Accept suggestion"
              >
                <Check size={12} />
              </button>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-navy-700 transition-colors"
                aria-label="Dismiss suggestion"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
