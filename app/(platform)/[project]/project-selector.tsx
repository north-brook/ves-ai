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

export default function ProjectSelector({ projects }: { projects: Project[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const params = useParams();
  const router = useRouter();
  const currentProjectSlug = params.project as string | undefined;

  const currentProject = projects.find((p) => p.slug === currentProjectSlug);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="border-border bg-background hover:bg-surface flex items-center gap-2 rounded-lg border px-4 py-2 font-medium transition-colors">
          {currentProject?.image && (
            <Image
              src={currentProject?.image || ""}
              alt={currentProject?.name || ""}
              width={20}
              height={20}
            />
          )}
          <span className="text-foreground">
            {currentProject ? currentProject.name : "Select Project"}
          </span>
          <ChevronDown
            className={`text-foreground-secondary h-4 w-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
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
              "hover:bg-surface flex w-full items-center gap-2 rounded px-3 py-2 text-left transition-colors",
              project.slug === currentProjectSlug
                ? "bg-surface text-foreground"
                : "text-foreground-secondary",
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
          className="text-foreground-secondary hover:bg-surface hover:text-foreground flex w-full items-center gap-2 rounded px-3 py-2 text-left transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="font-medium">New Project</span>
        </Link>
      </PopoverContent>
    </Popover>
  );
}
