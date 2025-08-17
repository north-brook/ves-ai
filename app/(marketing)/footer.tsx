import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-foreground-muted">
              Visual Evaluation System
            </span>
          </div>

          <div className="text-foreground-secondary flex gap-8 text-sm">
            <Link
              href="/pricing"
              className="hover:text-foreground transition-colors"
            >
              Pricing
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

        <div className="border-border text-foreground-muted mt-8 border-t pt-8 text-center text-sm">
          © {currentYear} Steppable Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
