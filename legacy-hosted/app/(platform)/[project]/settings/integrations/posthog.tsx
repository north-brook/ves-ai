"use client";

import PostHogIcon from "@/components/icons/posthog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Source } from "@/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  disconnectPostHog,
  fetchPostHogProjects,
  updatePostHogSource,
} from "./actions";

interface PostHogIntegrationProps {
  projectId: string;
  source: Pick<
    Source,
    "id" | "source_key" | "source_host" | "source_project"
  > | null;
}

export default function PostHogIntegration({
  projectId,
  source,
}: PostHogIntegrationProps) {
  const [showModal, setShowModal] = useState(false);
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

  const actualHost = hostSelection === "custom" ? customHost : hostSelection;
  const isConnected = !!source;

  const updateMutation = useMutation({
    mutationFn: updatePostHogSource,
    onSettled: (data) => {
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.success) {
        toast.success("PostHog updated successfully");
        setShowModal(false);
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectPostHog,
    onSettled: (data) => {
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.success) {
        toast.success("PostHog disconnected");
        setShowModal(false);
      }
    },
  });

  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ["posthog-projects", apiKey, actualHost],
    queryFn: async () => {
      if (!apiKey || !actualHost) return { projects: [] };
      const result = await fetchPostHogProjects(apiKey, actualHost);
      return "projects" in result ? result : { projects: [] };
    },
    enabled: showModal && !!apiKey && !!actualHost,
    staleTime: 30000,
    retry: 1,
  });

  const projects = projectsData?.projects || [];

  useEffect(() => {
    if (projects.length > 0 && !selectedProject && !source?.source_project) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject, source?.source_project]);

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Status Indicator */}
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <PostHogIcon
              size={20}
              className="text-slate-800 dark:text-slate-200"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className={
              isConnected
                ? "flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                : "flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            }
          >
            {isConnected ? (
              <>
                <Pencil className="h-4 w-4" />
                Manage
              </>
            ) : (
              "Connect"
            )}
          </button>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-6">
            <DialogTitle>
              <PostHogIcon
                size={28}
                className="text-slate-800 dark:text-slate-200"
              />
            </DialogTitle>
          </DialogHeader>

          <form
            action={(formData) => updateMutation.mutate(formData)}
            className="space-y-6"
          >
            <input type="hidden" name="projectId" value={projectId} />

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <h4 className="text-sm font-medium">Create API Key</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    All access + MCP server scope
                  </p>
                </div>
                <a
                  href="https://app.posthog.com/settings/user-api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  Get Key
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">API Key</label>
              <input
                type="password"
                name="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition-colors outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-slate-600"
                placeholder="phx_..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Host</label>
              <Select
                value={hostSelection}
                onValueChange={setHostSelection}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="https://us.posthog.com">
                    US Cloud
                  </SelectItem>
                  <SelectItem value="https://eu.posthog.com">
                    EU Cloud
                  </SelectItem>
                  <SelectItem value="custom">Custom (Self-hosted)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hostSelection === "custom" && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Custom Host URL
                </label>
                <input
                  type="url"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition-colors outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-slate-600"
                  placeholder="https://posthog.example.com"
                />
              </div>
            )}

            <input type="hidden" name="host" value={actualHost} />

            <div>
              <label className="mb-2 block text-sm font-medium">Project</label>
              <input
                type="hidden"
                name="posthogProject"
                value={selectedProject}
              />
              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
                disabled={loadingProjects || projects.length === 0}
                required
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingProjects ? "Loading projects..." : "Select project"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p: { id: string; name: string }) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="mt-6 gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                {isConnected && (
                  <button
                    type="button"
                    onClick={() => {
                      const formData = new FormData();
                      formData.append("projectId", projectId);
                      disconnectMutation.mutate(formData);
                    }}
                    disabled={disconnectMutation.isPending}
                    className="rounded-lg border border-red-300 bg-white px-4 py-2 font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/30"
                  >
                    {disconnectMutation.isPending ? (
                      <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
                    ) : (
                      "Disconnect"
                    )}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={
                    updateMutation.isPending ||
                    !apiKey ||
                    !actualHost ||
                    !selectedProject
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {updateMutation.isPending ? (
                    <>
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
