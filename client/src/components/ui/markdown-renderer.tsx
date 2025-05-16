import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('markdown-renderer', className)}>
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="scroll-m-20 text-3xl font-bold tracking-tight text-gray-900 mt-8 mb-4" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight text-gray-800 mt-6 mb-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="scroll-m-20 text-xl font-semibold tracking-tight text-gray-800 mt-5 mb-2" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-base leading-7 text-gray-600 mb-4" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="my-4 ml-6 list-disc" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="my-4 ml-6 list-decimal" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="mt-1 text-gray-600" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="mt-6 border-l-4 border-primary pl-4 italic text-gray-700" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-primary underline hover:text-primary/80 transition-colors" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-gray-900" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-6 border-gray-200" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}