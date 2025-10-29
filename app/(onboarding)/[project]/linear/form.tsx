"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Destination, Project } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { initiateLinearOAuth, saveLinearSettings } from "./actions";

interface LinearFormProps {
  project: Project;
  destination?: Destination | null;
  linearData?: {
    organization: {
      id: string;
      name: string;
      teams: {
        nodes: Array<{
          id: string;
          key: string;
          name: string;
        }>;
      };
    };
  } | null;
}

export function LinearForm({
  project,
  destination,
  linearData,
}: LinearFormProps) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");

  const [selectedTeam, setSelectedTeam] = useState(
    destination?.destination_team || "",
  );

  const isConnected = !!linearData?.organization;
  const teams = linearData?.organization?.teams?.nodes || [];
  const workspaceName = linearData?.organization?.name || "";

  // Auto-select first team when data loads
  useEffect(() => {
    if (teams.length > 0 && !selectedTeam && !destination?.destination_team) {
      setSelectedTeam(teams[0].id);
    }
  }, [teams, selectedTeam, destination?.destination_team]);

  const saveMutation = useMutation({
    mutationFn: saveLinearSettings,
    onSettled: (data) => {
      if (data?.error) toast.error(data.error);
    },
  });

  const connectMutation = useMutation({
    mutationFn: initiateLinearOAuth,
  });

  useEffect(() => {
    if (error) {
      toast.error(decodeURIComponent(error));
    }
    if (success) {
      toast.success("Linear connected successfully!");
    }
  }, [error, success]);

  return (
    <form action={saveMutation.mutate} className="space-y-6">
      <input type="hidden" name="projectSlug" value={project.slug} />
      <input
        type="hidden"
        name="linearWorkspace"
        value={linearData?.organization?.id || ""}
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h3 className="font-medium">Connect Linear Account</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isConnected
                ? "Connected and ready"
                : "Authorize access to create issues"}
            </p>
          </div>
          {!isConnected ? (
            <button
              type="button"
              onClick={() => initiateLinearOAuth(project.slug)}
              className="bg-background flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50 dark:border-slate-800 hover:dark:bg-slate-900"
            >
              Connect Linear
              {connectMutation.isIdle ? (
                <ExternalLink className="h-4 w-4" />
              ) : (
                <LoaderCircle className="text-foreground h-4 w-4 animate-spin" />
              )}
            </button>
          ) : (
            <button
              onClick={() => initiateLinearOAuth(project.slug)}
              type="submit"
              className="bg-background rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50 dark:border-slate-800 hover:dark:bg-slate-900"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="linearWorkspace"
          className="mb-2 block text-sm font-medium"
        >
          Linear Workspace
        </label>
        <div
          className={`rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900 ${!isConnected ? "opacity-50" : ""}`}
        >
          {isConnected ? (
            <span className="text-foreground">{workspaceName}</span>
          ) : (
            <span className="text-slate-600 dark:text-slate-400">
              Connect Linear to see workspace
            </span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="linearTeam" className="mb-2 block text-sm font-medium">
          Linear Team
        </label>
        <input type="hidden" name="linearTeam" value={selectedTeam} />
        <Select
          value={selectedTeam}
          onValueChange={setSelectedTeam}
          disabled={!isConnected}
          required
        >
          <SelectTrigger
            className={!isConnected ? "cursor-not-allowed opacity-50" : ""}
          >
            <SelectValue
              placeholder={
                !isConnected ? "Connect Linear first" : "Select a team"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {teams.length > 0 ? (
              teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name} ({team.key})
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-slate-600 dark:text-slate-400">
                {!isConnected
                  ? "Connect Linear to load teams"
                  : "No teams found"}
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={saveMutation.isPending || !selectedTeam || !isConnected}
          className="group font-display from-accent-purple via-accent-pink to-accent-orange relative w-full rounded-lg bg-gradient-to-r p-[2px] text-lg font-semibold transition-all duration-200 disabled:opacity-50"
        >
          <div className="bg-background group-hover:bg-background/90 flex items-center justify-center gap-2 rounded-[6px] px-8 py-4 transition-all">
            <span className="text-foreground font-semibold">Continue</span>
            {saveMutation.isPending ? (
              <LoaderCircle className="text-foreground h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="text-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
            )}
          </div>
        </button>
        <Link
          href={`/${project.slug}/welcome`}
          className="hover:text-foreground flex w-full items-center justify-center py-2 text-sm text-slate-600 transition-colors dark:text-slate-400"
        >
          Skip for now
        </Link>
      </div>
    </form>
  );
}

export function LinearFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-20 w-full animate-pulse rounded-lg bg-slate-50 dark:bg-slate-900" />

      <div>
        <div className="mb-2 h-5 w-32 animate-pulse rounded bg-slate-50 dark:bg-slate-900" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-slate-50 dark:bg-slate-900" />
      </div>

      <div>
        <div className="mb-2 h-5 w-32 animate-pulse rounded bg-slate-50 dark:bg-slate-900" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-slate-50 dark:bg-slate-900" />
      </div>

      <div className="from-accent-purple/20 via-accent-pink/20 to-accent-orange/20 h-14 w-full animate-pulse rounded-lg bg-gradient-to-r" />
    </div>
  );
}
