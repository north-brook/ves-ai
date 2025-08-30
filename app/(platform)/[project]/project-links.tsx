"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const NAV_ITEMS = (projectSlug: string) => [
  { href: `/${projectSlug}`, label: "Overview" },
  { href: `/${projectSlug}/sessions`, label: "Sessions" },
  { href: `/${projectSlug}/features`, label: "Features" },
  { href: `/${projectSlug}/issues`, label: "Issues" },
  { href: `/${projectSlug}/users`, label: "Users" },
  { href: `/${projectSlug}/settings`, label: "Settings" },
];

export default function ProjectLinks() {
  const params = useParams();
  const pathname = usePathname();

  if (!params.project) return null;

  return (
    <div className="flex w-full max-w-7xl items-center justify-start gap-4 px-6">
      {NAV_ITEMS(params.project as string).map((item) => (
        <ProjectLink
          key={item.href}
          href={item.href}
          label={item.label}
          active={pathname === item.href}
        />
      ))}
    </div>
  );
}

function ProjectLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "border-b px-3 py-2 transition-all",
        active
          ? "text-foreground border-foreground"
          : "text-foreground-secondary hover:text-foreground border-transparent hover:border-slate-300",
      )}
    >
      {label}
    </Link>
  );
}
