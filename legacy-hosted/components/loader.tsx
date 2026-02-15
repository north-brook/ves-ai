"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import VES from "./icons/ves";

export default function Loader({
  stages,
  finishFn,
}: {
  stages: {
    label: string;
    checkFn: () => Promise<boolean>;
  }[];
  finishFn: () => Promise<string | void>;
}) {
  const checkQuery = useQuery({
    queryKey: ["loader", stages.map((stage) => stage.label)],
    queryFn: async () => {
      return await Promise.all(stages.map((stage) => stage.checkFn()));
    },
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    initialData: stages.map(() => false),
  });
  const router = useRouter();

  const activeStageLabel =
    stages.find((stage, index) => !checkQuery.data?.[index])?.label || "";

  const redirectMutation = useMutation({
    mutationFn: finishFn,
    onSuccess: (redirect) => {
      if (redirect) router.replace(redirect);
    },
  });

  useEffect(() => {
    if (checkQuery.data?.every(Boolean)) redirectMutation.mutate();
  }, [checkQuery.data]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <VES size={100} className="mb-4" />
      <div className="flex h-2 w-full max-w-sm items-center justify-start rounded-full bg-slate-100 dark:bg-slate-900">
        <div
          className="bg-accent-purple dark:bg-accent-purple h-full animate-pulse rounded-full transition-all duration-1000"
          style={{
            width: `${Math.max(10, Math.min(90, (checkQuery.data?.filter(Boolean).length / stages.length) * 100))}%`,
          }}
        />
      </div>
      <p className="animate-fadeIn text-sm text-slate-500 dark:text-slate-400">
        {activeStageLabel}
      </p>
    </div>
  );
}
