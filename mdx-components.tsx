import type { MDXComponents } from "mdx/types";
import Image, { ImageProps } from "next/image";
import Link from "next/link";

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
    <p className="text-slate-600 dark:text-slate-400 mb-4">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-slate-100">
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,

  // Lists
  ul: ({ children }) => (
    <ul className="text-slate-600 dark:text-slate-400 ml-4 list-inside list-disc space-y-2 mb-4">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="text-slate-600 dark:text-slate-400 ml-4 list-inside list-decimal space-y-2 mb-4">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  // Links
  a: ({ href, children }) => (
    <Link
      href={href || "#"}
      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 transition-colors"
    >
      {children}
    </Link>
  ),

  // Code
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    }
    return (
      <code
        className={`${className} block bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4 text-sm font-mono leading-relaxed`}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4">
      {children}
    </pre>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-slate-300 dark:border-slate-700 pl-4 my-6 italic text-slate-700 dark:text-slate-300">
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="my-8 border-slate-200 dark:border-slate-800" />,

  // Table
  table: ({ children }) => (
    <div className="overflow-x-auto my-6">
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
    <th className="text-left px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
      {children}
    </td>
  ),

  // Images
  img: (props) => (
    <Image
      sizes="100vw"
      style={{ width: "100%", height: "auto" }}
      className="rounded-lg my-6"
      {...(props as ImageProps)}
    />
  ),
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
