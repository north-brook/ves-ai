"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-foreground mt-6 mb-4 text-2xl font-bold first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-foreground mt-5 mb-3 text-xl font-semibold first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-foreground mt-4 mb-2 text-lg font-semibold first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-foreground mt-3 mb-2 text-base font-medium first:mt-0">
              {children}
            </h4>
          ),

          // Paragraphs and text
          p: ({ children }) => (
            <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="text-foreground font-semibold">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-slate-600 dark:text-slate-400 italic">{children}</em>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="text-slate-600 dark:text-slate-400 mb-4 ml-6 list-outside list-disc space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="text-slate-600 dark:text-slate-400 mb-4 ml-6 list-outside list-decimal space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-slate-600 dark:text-slate-400 pl-1">{children}</li>
          ),

          // Code
          code: ({ children }) => (
            <code className="bg-slate-50 dark:bg-slate-900 text-accent-purple rounded px-1.5 py-0.5 font-mono text-base">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-slate-50 dark:bg-slate-900 mb-4 overflow-x-auto rounded-lg p-4">
              {children}
            </pre>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-accent-purple text-slate-600 dark:text-slate-400 mb-4 border-l-4 py-1 pl-4 italic">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-purple hover:text-accent-pink underline transition-colors"
            >
              {children}
            </a>
          ),

          // Tables
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto">
              <table className="w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-border border-b">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-border divide-y">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="text-foreground px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="text-slate-600 dark:text-slate-400 px-3 py-2">{children}</td>
          ),

          // Horizontal rule
          hr: () => <hr className="border-border my-6" />,

          // Images
          img: ({ alt, src }) => (
            <img
              src={src}
              alt={alt}
              className="my-4 h-auto max-w-full rounded-lg"
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
