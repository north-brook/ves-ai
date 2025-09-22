import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
      <div className="bg-slate-50/50 dark:bg-slate-900/50 border-border relative rounded-2xl border p-8 backdrop-blur-sm">
        {backHref && (
          <Link
            href={backHref}
            className="text-slate-600 dark:text-slate-400 hover:text-foreground absolute -top-12 left-0 flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        )}
        
        <div className="mb-8">
          <h2 className="font-display text-3xl font-bold">{title}</h2>
          {description && (
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
              {description}
            </p>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}