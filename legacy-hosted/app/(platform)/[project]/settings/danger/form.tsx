"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteProject } from "./actions";

interface DangerFormProps {
  project: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function DangerForm({ project }: DangerFormProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState("");

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSettled: (data) => {
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("Project deleted");
      }
    },
  });

  return (
    <div className="w-full max-w-2xl space-y-12">
      {/* Delete Project Section */}
      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-2xl font-semibold text-slate-800 dark:text-slate-200">
            Danger Zone
          </h2>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
          <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">
            Delete Project
          </h3>
          <p className="mb-4 text-sm text-red-700 dark:text-red-300">
            Permanently delete this project and all associated data. This action
            cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/30"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Project</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{project.name}</strong> and
              all associated data including sessions, issues, and team members.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <form
            action={(formData) => {
              deleteProjectMutation.mutate(formData);
              setShowDeleteDialog(false);
            }}
            className="space-y-4"
          >
            <input type="hidden" name="projectId" value={project.id} />

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                Type{" "}
                <code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-900">
                  {project.slug}
                </code>{" "}
                to confirm:
              </p>
              <input
                type="text"
                name="confirmSlug"
                value={deleteConfirmSlug}
                onChange={(e) => setDeleteConfirmSlug(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-colors focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-slate-600"
                placeholder={project.slug}
                autoFocus
              />
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmSlug("");
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  deleteConfirmSlug !== project.slug ||
                  deleteProjectMutation.isPending
                }
                className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleteProjectMutation.isPending ? (
                  <>
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Project</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
