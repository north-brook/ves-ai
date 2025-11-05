"use client";

import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, User, UserMinus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cancelInvite, inviteTeamMember, removeTeamMember } from "./actions";

interface TeamFormProps {
  project: {
    id: string;
    name: string;
    domain: string;
  };
  roles: Array<{
    id: string;
    user_email: string;
    user_id: string | null;
    created_at: string;
    users: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      image: string | null;
    } | null;
  }>;
  currentUserId: string;
}

export default function TeamForm({
  project,
  roles,
  currentUserId,
}: TeamFormProps) {
  const [email, setEmail] = useState("");

  const inviteMutation = useMutation({
    mutationFn: inviteTeamMember,
    onSettled: (data) => {
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.success) {
        toast.success(data.message || "Invites sent successfully");
        setEmail("");
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeTeamMember,
    onSettled: (data) => {
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.success) {
        toast.success("Team member removed");
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelInvite,
    onSettled: (data) => {
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.success) {
        toast.success("Invite cancelled");
      }
    },
  });

  const activeMembers = roles.filter((role) => role.user_id !== null);
  const pendingInvites = roles.filter((role) => role.user_id === null);

  return (
    <div className="w-full max-w-2xl space-y-12">
      {/* Team Members Section */}
      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-2xl font-semibold text-slate-800 dark:text-slate-200">
            Team Members
          </h2>
        </div>

        {/* Invite Form */}
        <form
          action={(formData) => inviteMutation.mutate(formData)}
          className="flex gap-3"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <input
            type="text"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`coworker@${project.domain}`}
            required
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition-colors outline-none placeholder:text-slate-600 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:placeholder:text-slate-400 dark:focus:border-slate-600"
          />
          <button
            type="submit"
            disabled={inviteMutation.isPending || !email}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {inviteMutation.isPending ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <span>Invite</span>
            )}
          </button>
        </form>

        {/* Members List */}
        <div className="space-y-4">
          {activeMembers.map((role) => {
            const isCurrentUser = role.user_id === currentUserId;
            const user = role.users;
            const displayName =
              user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : role.user_email;
            const initials =
              user?.first_name && user?.last_name
                ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
                : role.user_email.charAt(0).toUpperCase();

            return (
              <div
                key={role.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="flex items-center gap-4">
                  {user?.image ? (
                    <div className="h-8 w-8 overflow-hidden rounded-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={user.image}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {initials}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-800 dark:text-slate-200">
                      {displayName}
                    </span>
                    {user?.first_name && (
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {role.user_email}
                      </span>
                    )}
                  </div>
                </div>
                {!isCurrentUser && (
                  <form action={(formData) => removeMutation.mutate(formData)}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="roleId" value={role.id} />
                    <button
                      type="submit"
                      disabled={removeMutation.isPending}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      {removeMutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="h-4 w-4" />
                          <span>Remove</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            );
          })}

          {/* Pending Invites */}
          {pendingInvites.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700">
                  <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="text-sm text-slate-500 italic dark:text-slate-400">
                  {role.user_email}
                </span>
              </div>
              <form action={(formData) => cancelMutation.mutate(formData)}>
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="roleId" value={role.id} />
                <button
                  type="submit"
                  disabled={cancelMutation.isPending}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  {cancelMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
