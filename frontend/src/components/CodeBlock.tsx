import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface Props {
  language: string;
  children: string;
}

export default function CodeBlock({ language, children }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = children;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative my-3 overflow-hidden rounded-xl border border-navy-600/50">
      <div className="flex items-center justify-between border-b border-navy-600/50 bg-navy-800 px-4 py-2">
        <span className="font-mono text-xs uppercase text-gray-400">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-gray-400 transition-all hover:bg-navy-700 hover:text-white"
          aria-label="Copy code"
          type="button"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto bg-[#0D0F1A] p-4 text-sm leading-6 text-gray-200">
        <code>{children}</code>
      </pre>
    </div>
  );
}
