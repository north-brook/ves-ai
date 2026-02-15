import { CopyButton } from "./copy-button";

export function CodeBlock({
  code,
  className = "",
}: {
  code: string;
  className?: string;
}) {
  return (
    <div
      className={`group relative rounded-lg border border-border-subtle bg-terminal ${className}`}
    >
      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton
          className="rounded-md bg-bg-surface px-2 py-1 text-text-muted text-xs transition-colors hover:text-text-secondary"
          text={code}
        />
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-text-secondary">{code}</code>
      </pre>
    </div>
  );
}
