import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';

interface Props {
  status: 'sent' | 'delivered' | 'read';
  className?: string;
}

export default function ReadReceipt({ status, className = '' }: Props) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center ${className}`}
      title={status === 'read' ? 'Read' : status === 'delivered' ? 'Delivered' : 'Sent'}
    >
      {status === 'sent' && (
        <Check size={12} className="text-gray-600" />
      )}
      {status === 'delivered' && (
        <CheckCheck size={12} className="text-gray-500" />
      )}
      {status === 'read' && (
        <CheckCheck size={12} className="text-neon-blue" />
      )}
    </motion.span>
  );
}
