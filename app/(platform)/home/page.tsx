import { Suspense } from "react";
import { ProjectGrid, ProjectGridSkeleton } from "./project-grid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects • VES AI",
  description: "View and manage your VES AI projects.",
};

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Your Projects</h1>
        <p className="text-foreground-secondary mt-2">
          Select a project to view its dashboard
        </p>
      </div>

      <Suspense fallback={<ProjectGridSkeleton />}>
        <ProjectGrid />
      </Suspense>
    </div>
  );
}