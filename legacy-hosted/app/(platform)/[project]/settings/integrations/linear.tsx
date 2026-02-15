"use client";

import LinearIcon from "@/components/icons/linear";
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
import type { Destination } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  disconnectLinear,
  initiateLinearOAuth,
  updateLinearDestination,
} from "./actions";

interface LinearIntegrationProps {
  projectId: string;
  projectSlug: string;
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

export default function LinearIntegration({
  projectId,
  projectSlug,
  destination,
  linearData,
}: LinearIntegrationProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(
    destination?.destination_team || "",
  );
  const isConnected = !!destination && !!linearData;

  const updateMutation = useMutation({
    mutationFn: updateLinearDestination,
    onSettled: (data) => {
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.success) {
        toast.success("Linear updated successfully");
        setShowModal(false);
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectLinear,
    onSettled: (data) => {
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.success) {
        toast.success("Linear disconnected");
        setShowModal(false);
      }
    },
  });

  const selectedTeamData = linearData?.organization.teams.find(
    (t) => t.id === selectedTeam,
  );

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
            <LinearIcon
              size={20}
              className="text-slate-800 dark:text-slate-200"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (isConnected) {
                setShowModal(true);
              } else {
                initiateLinearOAuth(
                  projectSlug,
                  `/${projectSlug}/settings/integrations`,
                );
              }
            }}
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
              <>
                <ExternalLink className="h-4 w-4" />
                Connect
              </>
            )}
          </button>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader className="mb-6">
            <DialogTitle>
              <LinearIcon
                size={28}
                className="text-slate-800 dark:text-slate-200"
              />
            </DialogTitle>
          </DialogHeader>

          {isConnected && linearData && (
            <form
              action={(formData) => updateMutation.mutate(formData)}
              className="space-y-6"
            >
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="teamId" value={selectedTeam} />
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Organization
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-slate-800 dark:text-slate-200">
                    {linearData.organization.name}
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Team</label>
                <Select
                  value={selectedTeam}
                  onValueChange={setSelectedTeam}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {linearData.organization.teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.key})
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
                  <button
                    type="submit"
                    disabled={updateMutation.isPending || !selectedTeam}
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
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
