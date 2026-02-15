"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  children: string;
  className?: string;
}

export default function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="mt-6 mb-4 text-2xl font-bold text-slate-800 first:mt-0 dark:text-slate-200">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-5 mb-3 text-xl font-semibold text-slate-800 first:mt-0 dark:text-slate-200">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-2 text-lg font-semibold text-slate-800 first:mt-0 dark:text-slate-200">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-3 mb-2 text-base font-medium text-slate-800 first:mt-0 dark:text-slate-200">
              {children}
            </h4>
          ),

          // Paragraphs and text
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed text-slate-600 last:mb-0 dark:text-slate-400">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-800 dark:text-slate-200">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-slate-600 italic dark:text-slate-400">
              {children}
            </em>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="mb-4 ml-6 list-outside list-disc space-y-1 text-slate-600 dark:text-slate-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-6 list-outside list-decimal space-y-1 text-slate-600 dark:text-slate-400">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 text-slate-600 dark:text-slate-400">
              {children}
            </li>
          ),

          // Code
          code: ({ children }) => (
            <code className="rounded bg-slate-50 px-1.5 py-0.5 font-mono text-base text-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="mb-4 overflow-x-auto rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
              {children}
            </pre>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-4 border-slate-300 py-1 pl-4 text-slate-600 italic dark:border-slate-700 dark:text-slate-400">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 underline transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
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
            <thead className="border-b border-slate-200 dark:border-slate-800">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-slate-800 dark:text-slate-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
              {children}
            </td>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-slate-200 dark:border-slate-800" />
          ),

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
