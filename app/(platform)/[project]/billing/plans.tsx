"use client";

import { PLANS } from "@/config/pricing";
import { Project, ProjectPlan } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { cancel, checkout, downgrade, upgrade } from "./actions";

export default function Plans({
  project,
}: {
  project: Pick<Project, "plan" | "customer_id" | "subscription_id" | "id">;
}) {
  const currentPlanIndex = PLANS.findIndex((plan) => plan.id === project.plan);
  // Highlight the next most expensive plan (recommended upgrade)
  const recommendedPlanIndex = Math.min(currentPlanIndex + 1, PLANS.length - 1);

  // Mutations for actions
  const checkoutMutation = useMutation({
    mutationFn: (plan: ProjectPlan) =>
      checkout({ projectId: project.id, plan }),
    onSettled: (data) => {
      if (data?.error) toast.error(data.error || "Failed to start checkout");
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: (plan: ProjectPlan) => upgrade({ projectId: project.id, plan }),
    onSettled: (data) => {
      if (data?.error) toast.error(data.error || "Failed to upgrade plan");
    },
  });

  const downgradeMutation = useMutation({
    mutationFn: (plan: ProjectPlan) =>
      downgrade({ projectId: project.id, plan }),
    onSettled: (data) => {
      if (data?.error) toast.error(data.error || "Failed to downgrade plan");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancel({ projectId: project.id }),
    onSettled: (data) => {
      if (data?.error)
        toast.error(data.error || "Failed to cancel subscription");
    },
  });

  const isAnyPending =
    checkoutMutation.isPending ||
    upgradeMutation.isPending ||
    downgradeMutation.isPending ||
    cancelMutation.isPending;

  const handlePlanAction = (planId: ProjectPlan, planIndex: number) => {
    // Enterprise plan - contact sales
    if (planId === "enterprise") {
      window.location.href = "mailto:team@ves.ai";
      return;
    }

    // Current plan - no action
    if (planIndex === currentPlanIndex) {
      return;
    }

    // Upgrade
    if (planIndex > currentPlanIndex) {
      // If no customer_id, must use checkout
      if (!project.customer_id || !project.subscription_id) {
        checkoutMutation.mutate(planId);
      } else {
        upgradeMutation.mutate(planId);
      }
      return;
    }

    // Downgrade - requires existing subscription
    if (planIndex < currentPlanIndex) {
      downgradeMutation.mutate(planId);
    }
  };

  const isActionPending = (planId: ProjectPlan, planIndex: number) => {
    if (planIndex < currentPlanIndex) {
      return (
        downgradeMutation.isPending && downgradeMutation.variables === planId
      );
    }
    if (
      project.customer_id &&
      project.subscription_id &&
      planIndex > currentPlanIndex
    ) {
      return upgradeMutation.isPending && upgradeMutation.variables === planId;
    }
    if (
      !project.customer_id ||
      (!project.subscription_id && planIndex > currentPlanIndex)
    ) {
      return (
        checkoutMutation.isPending && checkoutMutation.variables === planId
      );
    }
    return false;
  };

  return (
    <section className="w-full max-w-6xl">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan, i) => {
          const isRecommended = i === recommendedPlanIndex;
          const isPrimary = i === recommendedPlanIndex;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 ${
                isRecommended
                  ? "from-accent-purple/10 to-accent-purple/5 border-accent-purple border-2 bg-gradient-to-b"
                  : "mt-px border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-3 right-0 left-0 flex w-full justify-center">
                  <span className="bg-accent-purple rounded-full px-3 py-1 text-xs font-medium text-white">
                    RECOMMENDED
                  </span>
                </div>
              )}

              <div className="flex flex-col items-stretch justify-start gap-4">
                <h3 className="font-display text-2xl font-bold">{plan.name}</h3>

                <div className="space-y-1">
                  <div className="text-3xl font-bold">
                    {plan.cost}
                    {plan.id !== "enterprise" && (
                      <span className="text-lg font-normal text-slate-600 dark:text-slate-400">
                        /mo
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-y border-slate-200 py-4 dark:border-slate-800">
                  <p className="text-foreground text-sm">{plan.sessions}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {plan.workers}
                  </p>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {plan.description}
                </p>

                <div className="mt-auto w-full">
                  {i < currentPlanIndex && (
                    <button
                      onClick={() => handlePlanAction(plan.id, i)}
                      disabled={isAnyPending}
                      className="bg-background mt-[2px] flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-3 text-center font-medium transition-all duration-200 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:hover:bg-slate-900"
                    >
                      {isActionPending(plan.id, i) ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : (
                        "Downgrade"
                      )}
                    </button>
                  )}
                  {i === currentPlanIndex && (
                    <button
                      disabled
                      className="bg-background mt-[2px] flex w-full cursor-default items-center justify-center gap-2 rounded-lg border border-slate-200 py-3 text-center font-medium opacity-50 dark:border-slate-800"
                    >
                      <Check className="h-5 w-5" />
                      Current Plan
                    </button>
                  )}
                  {i > currentPlanIndex && (
                    <button
                      onClick={() => handlePlanAction(plan.id, i)}
                      disabled={isAnyPending}
                      className={`mt-[2px] flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-center font-medium transition-all duration-200 disabled:opacity-50 ${
                        isPrimary
                          ? "bg-accent-purple border-slate-200 text-white hover:opacity-90 dark:border-slate-800"
                          : "bg-background border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                      }`}
                    >
                      {isActionPending(plan.id, i) ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : plan.id === "enterprise" ? (
                        "Contact Sales"
                      ) : (
                        "Upgrade"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
