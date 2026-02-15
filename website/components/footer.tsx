import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-border-subtle border-t">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <span className="font-bold text-sm text-text-muted tracking-tight">
          VES AI
        </span>
        <div className="flex items-center gap-6">
          <a
            className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
            href="https://github.com/north-brook/vesai"
            rel="noreferrer"
            target="_blank"
          >
            <Github size={14} />
            GitHub
          </a>
          <a
            className="text-sm text-text-muted transition-colors hover:text-text-secondary"
            href="#getting-started"
          >
            Install
          </a>
        </div>
      </div>
    </footer>
  );
}
