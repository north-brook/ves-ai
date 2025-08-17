"use client";

import { useState, useEffect } from "react";
import { ArrowRight, LoaderCircle, ExternalLink } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { initiateLinearOAuth, saveLinearSettings } from "./actions";
import { toast } from "sonner";
import Linear from "@/components/linear";
import { useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Destination } from "@/types";

interface LinearFormProps {
  projectSlug: string;
  existingDestination?: Destination | null;
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
  projectSlug,
  existingDestination,
  linearData,
}: LinearFormProps) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");

  const [selectedTeam, setSelectedTeam] = useState(
    existingDestination?.destination_team || "",
  );

  const isConnected = !!linearData?.organization;
  const teams = linearData?.organization?.teams?.nodes || [];
  const workspaceName = linearData?.organization?.name || "";

  // Auto-select first team when data loads
  useEffect(() => {
    if (
      teams.length > 0 &&
      !selectedTeam &&
      !existingDestination?.destination_team
    ) {
      setSelectedTeam(teams[0].id);
    }
  }, [teams, selectedTeam, existingDestination?.destination_team]);

  const saveMutation = useMutation({
    mutationFn: saveLinearSettings,
    onError: (error) => {
      toast.error(error.message || "Failed to save Linear settings");
    },
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
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <input
        type="hidden"
        name="linearWorkspace"
        value={linearData?.organization?.id || ""}
      />

      <div className="bg-surface/50 border-border rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h3 className="font-medium">Connect Linear Account</h3>
            <p className="text-foreground-secondary text-sm">
              {isConnected
                ? "Connected and ready"
                : "Authorize access to create issues"}
            </p>
          </div>
          {!isConnected ? (
            <button
              onClick={() => initiateLinearOAuth(projectSlug)}
              className="border-border bg-background hover:bg-surface flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            >
              Connect Linear
              <ExternalLink className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => initiateLinearOAuth(projectSlug)}
              type="submit"
              className="border-border bg-background hover:bg-surface rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
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
          className={`bg-surface border-border rounded-lg border px-4 py-3 ${!isConnected ? "opacity-50" : ""}`}
        >
          {isConnected ? (
            <span className="text-foreground">{workspaceName}</span>
          ) : (
            <span className="text-foreground-secondary">
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
              <div className="text-foreground-secondary px-2 py-1.5 text-sm">
                {!isConnected
                  ? "Connect Linear to load teams"
                  : "No teams found"}
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

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
    </form>
  );
}

export function LoadingLinearForm() {
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

      <div className="from-accent-purple/20 via-accent-pink/20 to-accent-orange/20 h-14 w-full animate-pulse rounded-lg bg-gradient-to-r" />
    </div>
  );
}
