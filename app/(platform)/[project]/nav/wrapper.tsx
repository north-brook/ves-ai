"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

export default function NavWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Collapse when scrolled down more than 50px
      if (currentScrollY > 50) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }

      lastScrollY.current = currentScrollY;
    };

    // Add scroll listener with passive flag for better performance
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Check initial scroll position
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav
      data-collapsed={isCollapsed ? "true" : undefined}
      className={cn(
        "border-border bg-background/80 sticky top-0 z-50 flex w-full flex-col items-center justify-start border-b backdrop-blur-lg transition-all duration-300 ease-in-out",
      )}
    >
      {children}
    </nav>
  );
}
