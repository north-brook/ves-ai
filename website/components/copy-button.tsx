"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({
  text,
  className = "",
  children,
}: {
  text: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className={className} onClick={copy} type="button">
      {copied ? (
        <span className="flex items-center gap-1.5">
          <Check size={14} />
          Copied
        </span>
      ) : (
        (children ?? (
          <span className="flex items-center gap-1.5">
            <Copy size={14} />
            Copy
          </span>
        ))
      )}
    </button>
  );
}
