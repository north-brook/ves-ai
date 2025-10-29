"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Project } from "@/types";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function NavProject({ projects }: { projects: Project[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const params = useParams();
  const router = useRouter();
  const currentProjectSlug = params.project as string | undefined;

  const currentProject = projects.find((p) => p.slug === currentProjectSlug);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 py-1 font-medium transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-900">
          {currentProject?.image && (
            <img
              src={currentProject?.image || ""}
              alt={currentProject?.name || ""}
              width={20}
              height={20}
              className="rounded"
            />
          )}
          <span className="overflow-hidden font-semibold whitespace-nowrap text-slate-800 transition-all duration-300 dark:text-slate-200">
            {currentProject ? currentProject.name : "Select Project"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => {
              router.push(`/${project.slug}`);
              setIsOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900",
              project.slug === currentProjectSlug
                ? "bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                : "text-slate-600 dark:text-slate-400",
            )}
          >
            {project.image && (
              <img
                src={project.image}
                alt={project.name}
                width={20}
                height={20}
                className="rounded"
              />
            )}
            <span className="text-base font-semibold">{project.name}</span>
          </button>
        ))}

        <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

        <Link
          href="/new"
          onClick={() => setIsOpen(false)}
          className="hover:text-foreground flex w-full items-center gap-2 rounded px-3 py-2 text-left text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">New Project</span>
        </Link>
      </PopoverContent>
    </Popover>
  );
}
