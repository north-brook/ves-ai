"use client";

import VES from "@/components/icons/ves";
import { Project } from "@/types";
import { AuthUser } from "@supabase/supabase-js";
import LogInButton from "./log-in-button";

export default function NoAccess({
  project,
  authUser,
}: {
  project: Pick<Project, "name">;
  authUser: AuthUser;
}) {
  return (
    <main className="flex h-[calc(100vh-48px)] w-full flex-col items-center justify-center">
      <div className="flex max-w-4xl flex-col items-center gap-8 text-center">
        <VES size={100} />
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-display text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
            {`Access denied`}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {authUser.email}
            </span>{" "}
            does not have access to{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {project.name}
            </span>
          </p>
        </div>
        <LogInButton label="Use a different account" />
      </div>
    </main>
  );
}
