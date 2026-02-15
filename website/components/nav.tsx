"use client";

import { Github, Star } from "lucide-react";
import { useEffect, useState } from "react";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("https://api.github.com/repos/north-brook/vesai", {
      headers: { Accept: "application/vnd.github.v3+json" },
    })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-border-subtle border-b bg-bg-primary/80 backdrop-blur-md"
          : ""
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a
          className="font-bold text-lg text-text-primary tracking-tight"
          href="/"
        >
          VES AI
        </a>
        <div className="flex items-center gap-4">
          <a
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
            href="https://github.com/north-brook/vesai"
            rel="noreferrer"
            target="_blank"
          >
            <Github size={16} />
            {stars !== null && (
              <>
                <Star className="fill-amber-400 text-amber-400" size={12} />
                <span className="tabular-nums">{stars}</span>
              </>
            )}
          </a>
          <a
            className="rounded-lg bg-accent px-4 py-2 font-medium text-bg-primary text-sm transition-colors hover:bg-accent/90"
            href="#getting-started"
          >
            Install
          </a>
        </div>
      </div>
    </nav>
  );
}
