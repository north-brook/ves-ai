"use client";

import Google from "@/components/icons/google";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { googleAuth } from "./actions";

export default function LogInButton({
  label = "Continue with Google",
}: {
  label?: string;
}) {
  const next = usePathname();
  const googleAuthMutation = useMutation({
    mutationFn: googleAuth,
    onSettled: (data) => {
      if (data?.error) toast.error(data.error);
    },
  });

  return (
    <form
      action={googleAuthMutation.mutate}
      className="flex w-full flex-col items-center gap-2"
    >
      {!!next && next !== "/login" && (
        <input type="hidden" name="next" value={next} />
      )}
      <button
        type="submit"
        className="group from-accent-purple via-accent-pink to-accent-orange relative rounded-lg bg-gradient-to-r p-[2px] text-lg font-semibold transition-all duration-200"
      >
        <div className="bg-background group-hover:bg-background/90 flex items-center gap-2 rounded-[10px] px-8 py-4 transition-all">
          <Google size={20} />
          <span className="text-foreground font-semibold">{label}</span>
          {googleAuthMutation.isIdle ? (
            <ArrowRight
              size={18}
              className="text-foreground transition-transform group-hover:translate-x-1"
            />
          ) : (
            <LoaderCircle
              size={18}
              className="text-foreground animate-spin transition-transform group-hover:translate-x-1"
            />
          )}
        </div>
      </button>
    </form>
  );
}
