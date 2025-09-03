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
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let prevScrollY = window.scrollY;

    const handleScroll = () => {
      // Clear any existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Mark that we're actively scrolling
      if (!isScrolling.current) {
        isScrolling.current = true;
        prevScrollY = lastScrollY.current;
      }

      const currentScrollY = window.scrollY;

      // Set a timeout to mark scrolling as complete
      scrollTimeout.current = setTimeout(() => {
        isScrolling.current = false;
        lastScrollY.current = currentScrollY;
      }, 150);

      // Calculate the true scroll delta from when scrolling started
      const scrollDelta = currentScrollY - prevScrollY;

      // Only collapse/expand based on significant intentional scrolling
      if (Math.abs(scrollDelta) > 30) {
        if (scrollDelta > 0 && currentScrollY > 100) {
          // Scrolling down significantly
          setIsCollapsed(true);
        } else if (scrollDelta < -30) {
          // Scrolling up significantly
          setIsCollapsed(false);
        }
      }

      // Always expand near the top
      if (currentScrollY < 50) {
        setIsCollapsed(false);
      }
    };

    // Add scroll listener with passive flag for better performance
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Set initial state
    lastScrollY.current = window.scrollY;
    if (window.scrollY > 100) {
      setIsCollapsed(true);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  return (
    <nav
      data-collapsed={isCollapsed ? "true" : undefined}
      className={cn(
        "border-border bg-background/90 sticky top-0 z-50 flex w-full flex-col items-center justify-start border-b backdrop-blur-lg transition-all duration-300 ease-in-out",
      )}
    >
      {children}
    </nav>
  );
}
