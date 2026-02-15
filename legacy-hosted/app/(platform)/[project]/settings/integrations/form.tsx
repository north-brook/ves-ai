"use client";

import type { Destination, Project, Source } from "@/types";
import PostHogIntegration from "./posthog";
import LinearIntegration from "./linear";

interface IntegrationsFormProps {
  project: Pick<Project, "id" | "name" | "slug">;
  source: Pick<
    Source,
    "id" | "source_key" | "source_host" | "source_project"
  > | null;
  destination: Pick<
    Destination,
    "id" | "destination_workspace" | "destination_team"
  > | null;
  linearData: {
    organization: {
      name: string;
      teams: Array<{
        id: string;
        key: string;
        name: string;
      }>;
    };
  } | null;
}

export default function IntegrationsForm({
  project,
  source,
  destination,
  linearData,
}: IntegrationsFormProps) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-semibold text-slate-800 dark:text-slate-200">
          Integrations
        </h2>
      </div>

      <PostHogIntegration projectId={project.id} source={source} />

      <LinearIntegration
        projectId={project.id}
        projectSlug={project.slug}
        destination={destination}
        linearData={linearData}
      />
    </div>
  );
}
