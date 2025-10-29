"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type SectionNavItem = {
  color: string;
  name: string | null;
  link: string;
  active: boolean;
  muted?: boolean;
};

export default function SectionNav({
  name,
  search,
  items,
}: {
  name: string;
  search: {
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    pending: boolean;
  };
  items: Omit<SectionNavItem, "active">[];
}) {
  const pathname = usePathname();

  return (
    <section className="sticky top-12 flex h-[calc(100vh-48px)] max-h-[calc(100vh-48px)] w-full max-w-[240px] flex-col items-stretch justify-start gap-2 overflow-y-auto border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <h1 className="sticky top-0 border-b border-slate-200 bg-slate-50 px-4 py-2 font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
        {name}
      </h1>
      {/* <div className="relative w-full px-4 py-3">
        <Search className="absolute top-1/2 left-8 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
        <input
          type="text"
          placeholder={search.placeholder}
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          className="border-slate-200 dark:border-slate-800 bg-background focus:ring-accent-purple w-full rounded-lg border py-2 pr-4 pl-10 text-sm focus:ring focus:outline-none"
          disabled={search.pending}
        />
        {search.pending && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent dark:border-slate-400" />
          </div>
        )}
      </div> */}

      <div className="flex w-full flex-col gap-0.5 px-1.5 pb-5">
        {items.map((item) => (
          <SectionNavItem
            key={item.link}
            {...item}
            active={pathname.includes(item.link)}
          />
        ))}
      </div>
    </section>
  );
}

function SectionNavItem({ link, name, color, active, muted }: SectionNavItem) {
  return (
    <Link
      href={link}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-300",
        active
          ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
          : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800",
      )}
      prefetch={false}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />

      {!!name && (
        <span
          className={cn(
            "overflow-hidden text-sm text-ellipsis whitespace-nowrap",
            muted && "italic",
          )}
        >
          {name}
        </span>
      )}
    </Link>
  );
}

export function SectionNavSkeleton() {
  return (
    <section className="sticky top-0 flex w-full max-w-[240px] flex-col items-stretch justify-start gap-2 border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="w-full border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      </div>
      <div className="flex w-full flex-col gap-1.5 px-1.5 pb-5">
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
      </div>
    </section>
  );
}
