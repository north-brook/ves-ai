"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold text-foreground mb-4 mt-6 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold text-foreground mb-3 mt-5 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold text-foreground mb-2 mt-4 first:mt-0">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-medium text-foreground mb-2 mt-3 first:mt-0">
            {children}
          </h4>
        ),
        
        // Paragraphs and text
        p: ({ children }) => (
          <p className="text-foreground-secondary leading-relaxed mb-4 last:mb-0">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground-secondary">{children}</em>
        ),
        
        // Lists
        ul: ({ children }) => (
          <ul className="list-disc list-outside ml-6 space-y-1 mb-4 text-foreground-secondary">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside ml-6 space-y-1 mb-4 text-foreground-secondary">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-foreground-secondary pl-1">
            {children}
          </li>
        ),
        
        // Code
        code: ({ children }) => (
          <code className="px-1.5 py-0.5 bg-surface rounded text-sm font-mono text-accent-purple">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-surface rounded-lg p-4 overflow-x-auto mb-4">
            {children}
          </pre>
        ),
        
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-accent-purple pl-4 py-1 mb-4 italic text-foreground-secondary">
            {children}
          </blockquote>
        ),
        
        // Links
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-purple hover:text-accent-pink transition-colors underline"
          >
            {children}
          </a>
        ),
        
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-border">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-border">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-surface/50 transition-colors">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="text-left font-semibold text-foreground px-3 py-2">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="text-foreground-secondary px-3 py-2">
            {children}
          </td>
        ),
        
        // Horizontal rule
        hr: () => (
          <hr className="border-border my-6" />
        ),
        
        // Images
        img: ({ alt, src }) => (
          <img
            src={src}
            alt={alt}
            className="rounded-lg max-w-full h-auto my-4"
          />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}