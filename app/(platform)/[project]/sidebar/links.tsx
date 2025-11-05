"use client";

import clientSupabase from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Flag,
  LucideIcon,
  Play,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createElement, Fragment } from "react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  countFn?: () => Promise<number | null>;
  exact?: boolean;
};

export default function NavLinks({ projectSlug }: { projectSlug: string }) {
  const pathname = usePathname();
  const supabase = clientSupabase();

  const NAV_ITEMS: Omit<NavLink, "active">[][] = [
    // [
    //   {
    //     href: `/${projectSlug}`,
    //     label: "Overview",
    //     icon: House,
    //     exact: true,
    //   },
    //   {
    //     href: `/${projectSlug}/reports`,
    //     label: "Reports",
    //     icon: FileText,
    //   },
    // ],
    [
      {
        href: `/${projectSlug}/sessions`,
        label: "Sessions",
        icon: Play,
        countFn: async () => {
          const { data: project } = await supabase
            .from("projects")
            .select("*")
            .eq("slug", projectSlug)
            .single();
          if (!project) return null;
          const { count } = await supabase
            .from("sessions")
            .select("id", { count: "exact", head: true })
            .eq("project_id", project.id)
            .eq("status", "analyzed");
          return count || null;
        },
      },
      {
        href: `/${projectSlug}/issues`,
        label: "Issues",
        icon: Flag,
        countFn: async () => {
          const { data: project } = await supabase
            .from("projects")
            .select("*")
            .eq("slug", projectSlug)
            .single();
          if (!project) return null;
          const { count } = await supabase
            .from("issues")
            .select("id", { count: "exact", head: true })
            .eq("project_id", project.id);
          return count || null;
        },
      },
      {
        href: `/${projectSlug}/users`,
        label: "Users",
        icon: Users,
        countFn: async () => {
          const { data: project } = await supabase
            .from("projects")
            .select("*")
            .eq("slug", projectSlug)
            .single();
          if (!project) return null;
          const { count } = await supabase
            .from("project_users")
            .select("id", { count: "exact", head: true })
            .eq("project_id", project.id)
            .eq("status", "analyzed");
          return count || null;
        },
      },
      {
        href: `/${projectSlug}/groups`,
        label: "Groups",
        icon: Building2,
        countFn: async () => {
          const { data: project } = await supabase
            .from("projects")
            .select("*")
            .eq("slug", projectSlug)
            .single();
          if (!project) return null;
          const { count } = await supabase
            .from("project_groups")
            .select("id", { count: "exact", head: true })
            .eq("project_id", project.id)
            .eq("status", "analyzed");
          return count || null;
        },
      },
    ],
    [{ href: `/${projectSlug}/settings`, label: "Settings", icon: Settings }],
  ];

  return (
    <div className="flex w-full flex-col items-stretch gap-4 px-1.5 py-3">
      {NAV_ITEMS.map((section, i) => (
        <Fragment key={`nav-section-${i}`}>
          {i > 0 && (
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          )}
          <div className="flex flex-col items-stretch gap-1">
            {section.map((item) => (
              <ProjectLink
                key={item.href}
                active={
                  item.exact
                    ? pathname === item.href
                    : pathname.includes(item.href)
                }
                {...item}
              />
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function ProjectLink({ href, label, active, icon, countFn }: NavLink) {
  const countQuery = useQuery({
    queryKey: ["count", href],
    queryFn: countFn ? countFn : () => null,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: !!countFn,
  });

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-all duration-300",
        active
          ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
          : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800",
      )}
    >
      <div className="flex items-center gap-2">
        {createElement(icon, {
          size: 18,
          className: cn(
            active
              ? "text-slate-800 dark:text-slate-200"
              : "text-slate-500 dark:text-slate-500",
          ),
        })}
        <span className="opacity-0 transition-all duration-300 group-hover:opacity-100">
          {label}
        </span>
      </div>
      {!!countQuery.data && (
        <div className="flex items-center justify-center rounded border border-slate-200 bg-slate-50 px-1 py-0.5 [font-size:10px] text-slate-600 opacity-0 transition-all duration-1000 group-hover:opacity-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          {countQuery.data}
        </div>
      )}
    </Link>
  );
}
