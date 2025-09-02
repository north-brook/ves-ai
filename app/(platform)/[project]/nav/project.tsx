"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Project } from "@/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function NavProject({ projects }: { projects: Project[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const params = useParams();
  const router = useRouter();
  const currentProjectSlug = params.project as string | undefined;

  const currentProject = projects.find((p) => p.slug === currentProjectSlug);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1 font-medium transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-900 [nav[data-collapsed='true']_&]:gap-0">
          {currentProject?.image && (
            <Image
              src={currentProject?.image || ""}
              alt={currentProject?.name || ""}
              width={20}
              height={20}
              className="flex-shrink-0"
            />
          )}
          <span className="text-foreground overflow-hidden whitespace-nowrap transition-all duration-300 [nav[data-collapsed='true']_&]:w-0 [nav[data-collapsed='true']_&]:opacity-0">
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
                ? "text-foreground bg-slate-50 dark:bg-slate-900"
                : "text-slate-600 dark:text-slate-400",
            )}
          >
            {project.image && (
              <Image
                src={project.image}
                alt={project.name}
                width={20}
                height={20}
              />
            )}
            <span className="font-medium">{project.name}</span>
          </button>
        ))}

        <div className="border-border my-1 border-t" />

        <Link
          href="/new"
          onClick={() => setIsOpen(false)}
          className="hover:text-foreground flex w-full items-center gap-2 rounded px-3 py-2 text-left text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          <Plus className="h-4 w-4" />
          <span className="font-medium">New Project</span>
        </Link>
      </PopoverContent>
    </Popover>
  );
}
