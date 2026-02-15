import { Github } from "lucide-react";

function NorthBrookLogo() {
  return (
    <svg
      className="opacity-60"
      fill="none"
      height="19"
      viewBox="0 0 608 729"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>North Brook</title>
      <path
        d="M272.233 0L380.334 0.263884L608 698.047L505.351 728.442L505.116 728.719L504.934 728.565L503.656 728.95L502.932 726.841L251.13 510.664L286.698 419.566L442.541 550.633L320.343 194.075L112.224 729L0 691.634L272.233 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-border-subtle border-t">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <a
          className="flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text-secondary"
          href="https://www.northbrook.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          <NorthBrookLogo />
          North Brook
        </a>
        <div className="flex items-center gap-5 text-sm text-text-muted">
          <a
            className="flex items-center gap-1.5 transition-colors hover:text-text-secondary"
            href="https://github.com/north-brook/vesai"
            rel="noreferrer"
            target="_blank"
          >
            <Github size={14} />
            GitHub
          </a>
          <a
            className="transition-colors hover:text-text-secondary"
            href="#getting-started"
          >
            Install
          </a>
        </div>
      </div>
    </footer>
  );
}
