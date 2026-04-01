import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;
            if (isInline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <CodeBlock language={match ? match[1] : ''}>
                {String(children).replace(/\n$/, '')}
              </CodeBlock>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:text-blue-300 underline transition-colors">
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3">
                <table className="w-full">{children}</table>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
