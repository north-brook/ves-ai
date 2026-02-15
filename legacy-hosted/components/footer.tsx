import Logo from "@/app/(marketing)/logo";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-slate-400 dark:text-slate-500">
              Visual Evaluation System
            </span>
          </div>

          <div className="flex gap-8 text-sm text-slate-600 dark:text-slate-400">
            <Link
              href="/pricing"
              className="hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="hover:text-foreground transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="mailto:team@ves.ai"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
          © {currentYear} Steppable Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
