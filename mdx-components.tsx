import "highlight.js/styles/atom-one-dark.css";
import type { MDXComponents } from "mdx/types";
import Image, { ImageProps } from "next/image";
import Link from "next/link";
import { cn } from "./lib/utils";

const components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="font-display mb-8 text-4xl font-bold text-slate-900 dark:text-slate-100">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-display mt-12 mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-display mt-8 mb-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="font-display mt-6 mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="font-display mt-4 mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="font-display mt-4 mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
      {children}
    </h6>
  ),

  // Text elements
  p: ({ children }) => (
    <p className="mb-4 text-slate-600 dark:text-slate-400">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-slate-100">
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,

  // Lists
  ul: ({ children }) => (
    <ul className="mb-4 ml-4 list-inside list-disc space-y-2 text-slate-600 dark:text-slate-400">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-4 list-inside list-decimal space-y-2 text-slate-600 dark:text-slate-400">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  // Links
  a: ({ href, children }) => (
    <Link
      href={href || "#"}
      className="text-blue-600 underline underline-offset-2 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {children}
    </Link>
  ),

  // Code
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return <code>{children}</code>;
    }
    return <code className={cn(className, "rounded-lg")}>{children}</code>;
  },
  pre: ({ children }) => <pre className="mb-4 rounded-lg">{children}</pre>,

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-4 border-slate-300 pl-4 text-slate-700 italic dark:border-slate-700 dark:text-slate-300">
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="my-8 border-slate-200 dark:border-slate-800" />,

  // Table
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto">
      <table className="min-w-full border-collapse border border-slate-200 dark:border-slate-800">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50 dark:bg-slate-900">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-slate-200 dark:border-slate-800">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="border border-slate-200 px-4 py-3 text-left font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-200 px-4 py-3 text-slate-600 dark:border-slate-800 dark:text-slate-400">
      {children}
    </td>
  ),

  // Images
  img: (props) => (
    <Image
      sizes="100vw"
      style={{ width: "100%", height: "auto" }}
      className="my-6 rounded-lg"
      {...(props as ImageProps)}
    />
  ),
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
