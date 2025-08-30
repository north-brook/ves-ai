"use client";

import { useState, useEffect } from "react";
import { ArrowRight, LoaderCircle, ExternalLink } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { connectPostHog, fetchPostHogProjects } from "./actions";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Project, Source } from "@/types";

interface PostHogFormProps {
  project: Project;
  source?: Source | null;
}

export function PostHogForm({ project, source }: PostHogFormProps) {
  const [apiKey, setApiKey] = useState(source?.source_key || "");
  const [hostSelection, setHostSelection] = useState(
    source?.source_host &&
      !source.source_host.includes("us.posthog.com") &&
      !source.source_host.includes("eu.posthog.com")
      ? "custom"
      : source?.source_host || "https://us.posthog.com",
  );
  const [customHost, setCustomHost] = useState(
    source?.source_host &&
      !source.source_host.includes("us.posthog.com") &&
      !source.source_host.includes("eu.posthog.com")
      ? source.source_host
      : "",
  );
  const [selectedProject, setSelectedProject] = useState(
    source?.source_project || "",
  );

  const connectMutation = useMutation({
    mutationFn: connectPostHog,
    onSettled: (data) => {
      if (data?.error) toast.error(data.error);
    },
  });

  // Determine the actual host to use
  const actualHost = hostSelection === "custom" ? customHost : hostSelection;

  // Fetch projects when API key and host are provided
  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ["posthog-projects", apiKey, actualHost],
    queryFn: async () => {
      if (!apiKey || !actualHost) return { projects: [] };
      const result = await fetchPostHogProjects(apiKey, actualHost);
      return "projects" in result ? result : { projects: [] };
    },
    enabled: !!apiKey && !!actualHost,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1,
  });

  const projects = projectsData?.projects || [];

  // Auto-select the first project when projects are loaded
  useEffect(() => {
    if (projects.length > 0 && !selectedProject && !source?.source_project) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject, source?.source_project]);

  return (
    <form action={connectMutation.mutate} className="space-y-6">
      <input type="hidden" name="projectSlug" value={project.slug} />

      <div className="bg-surface/50 border-border rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h3 className="font-medium">Create a PostHog API Key</h3>
            <p className="text-foreground-secondary text-sm">
              Give the key <b>MCP Server</b> scope
            </p>
          </div>
          <a
            href="https://app.posthog.com/settings/user-api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="border-border bg-background hover:bg-surface flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            Get API Key
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div>
        <label htmlFor="apiKey" className="mb-2 block text-sm font-medium">
          PostHog Personal API Key
        </label>
        <input
          type="password"
          id="apiKey"
          name="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
          className="bg-surface border-border placeholder:text-foreground-secondary focus:border-accent-purple w-full rounded-lg border px-4 py-3 font-mono text-sm transition-colors outline-none"
          placeholder="phx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        />
      </div>

      <div>
        <label htmlFor="host" className="mb-2 block text-sm font-medium">
          PostHog Region/Host
        </label>
        <input type="hidden" name="host" value={actualHost} />
        <Select value={hostSelection} onValueChange={setHostSelection} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="https://us.posthog.com">
              US Cloud (us.posthog.com)
            </SelectItem>
            <SelectItem value="https://eu.posthog.com">
              EU Cloud (eu.posthog.com)
            </SelectItem>
            <SelectItem value="custom">Self-hosted (custom URL)</SelectItem>
          </SelectContent>
        </Select>
        {hostSelection === "custom" && (
          <input
            type="url"
            value={customHost}
            onChange={(e) => setCustomHost(e.target.value)}
            required
            placeholder={`https://posthog.${project.domain}`}
            className="bg-surface border-border placeholder:text-foreground-secondary focus:border-accent-purple mt-2 w-full rounded-lg border px-4 py-3 transition-colors outline-none"
          />
        )}
      </div>

      <div>
        <label
          htmlFor="posthogProject"
          className="mb-2 block text-sm font-medium"
        >
          PostHog Project
        </label>
        <input type="hidden" name="posthogProject" value={selectedProject} />
        <Select
          value={selectedProject}
          onValueChange={setSelectedProject}
          disabled={!apiKey || loadingProjects}
          required
        >
          <SelectTrigger
            className={!apiKey ? "cursor-not-allowed opacity-50" : ""}
          >
            <SelectValue
              placeholder={
                !apiKey
                  ? "Enter API key first"
                  : loadingProjects
                    ? "Loading projects..."
                    : "Select a project"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {projects.length > 0 ? (
              projects.map((project: { id: string; name: string }) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))
            ) : (
              <div className="text-foreground-secondary px-2 py-1.5 text-sm">
                {!apiKey
                  ? "Enter API key to load projects"
                  : "No projects found"}
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      <button
        type="submit"
        disabled={connectMutation.isPending || !apiKey || !selectedProject}
        className="group font-display from-accent-purple via-accent-pink to-accent-orange relative w-full rounded-lg bg-gradient-to-r p-[2px] text-lg font-semibold transition-all duration-200 disabled:opacity-50"
      >
        <div className="bg-background group-hover:bg-background/90 flex items-center justify-center gap-2 rounded-[6px] px-8 py-4 transition-all">
          <span className="text-foreground font-semibold">Continue</span>
          {connectMutation.isPending ? (
            <LoaderCircle className="text-foreground h-5 w-5 animate-spin" />
          ) : (
            <ArrowRight className="text-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
          )}
        </div>
      </button>
    </form>
  );
}

export function PostHogFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-surface h-20 w-full animate-pulse rounded-lg" />

      <div>
        <div className="bg-surface mb-2 h-5 w-32 animate-pulse rounded" />
        <div className="bg-surface h-12 w-full animate-pulse rounded-lg" />
      </div>

      <div>
        <div className="bg-surface mb-2 h-5 w-32 animate-pulse rounded" />
        <div className="bg-surface h-12 w-full animate-pulse rounded-lg" />
      </div>

      <div>
        <div className="bg-surface mb-2 h-5 w-32 animate-pulse rounded" />
        <div className="bg-surface h-12 w-full animate-pulse rounded-lg" />
      </div>

      <div className="from-accent-purple/20 via-accent-pink/20 to-accent-orange/20 h-14 w-full animate-pulse rounded-lg bg-gradient-to-r" />
    </div>
  );
}
