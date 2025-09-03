"use client";

import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { hasGroups } from "./actions";

export default function NavLinks() {
  const params = useParams();
  const pathname = usePathname();

  const hasGroupsQuery = useQuery({
    queryKey: ["hasGroups", params.project],
    queryFn: () => hasGroups(params.project as string),
  });

  const NAV_ITEMS = (projectSlug: string) => [
    { href: `/${projectSlug}`, label: "Overview" },
    { href: `/${projectSlug}/sessions`, label: "Sessions" },
    { href: `/${projectSlug}/issues`, label: "Issues" },
    { href: `/${projectSlug}/users`, label: "Users" },
    ...(hasGroupsQuery.data
      ? [{ href: `/${projectSlug}/groups`, label: "Groups" }]
      : []),
    { href: `/${projectSlug}/settings`, label: "Settings" },
  ];

  if (!params.project) return null;

  return (
    <div className="flex h-full w-full max-w-7xl items-stretch justify-start gap-0 transition-all duration-300 md:gap-2 [nav[data-collapsed='true']_&]:gap-0">
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
        "flex items-center justify-center border-t-2 border-b-2 border-t-transparent px-3 pt-1 pb-3 text-sm transition-all duration-300 [nav[data-collapsed='true']_&]:pt-3",
        active
          ? "text-foreground border-b-foreground font-semibold"
          : "hover:text-foreground border-b-transparent text-slate-600 hover:border-b-slate-300 dark:text-slate-400",
      )}
    >
      {label}
    </Link>
  );
}
