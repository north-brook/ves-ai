import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

interface StepLayoutProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  backHref?: string;
}

export function StepLayout({
  title,
  description,
  children,
  backHref,
}: StepLayoutProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-8 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50">
        {backHref && (
          <Link
            href={backHref}
            className="hover:text-foreground absolute -top-12 left-0 flex items-center gap-2 text-sm text-slate-600 transition-colors dark:text-slate-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        )}

        <div className="mb-8">
          <h2 className="font-display text-3xl font-bold">{title}</h2>
          {description && (
            <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
