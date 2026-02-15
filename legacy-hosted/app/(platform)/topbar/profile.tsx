"use client";

import { User } from "@/types";
import { User as UserIcon } from "lucide-react";
import Image from "next/image";

export default function NavProfile({ user }: { user: User | null }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      {user?.image ? (
        <Image
          src={user.image}
          alt={user.first_name || "User"}
          height={28}
          width={28}
          className="rounded-full object-cover"
        />
      ) : (
        <UserIcon className="h-7 w-7 text-slate-600 dark:text-slate-400" />
      )}
    </div>
  );
}
