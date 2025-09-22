"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { User } from "@/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";

export default function NavProfile({ user }: { user: User | null }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="border-border flex h-7 w-7 items-center justify-center rounded-full border bg-slate-50 transition-colors hover:bg-slate-50 dark:bg-slate-900">
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
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="border-border border-b pb-3">
          <p className="text-foreground font-medium">
            {user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : "User"}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {user?.email}
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/auth/logout"
            prefetch={false}
            className="hover:text-foreground flex items-center gap-2 rounded px-2 py-2 text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 hover:dark:bg-slate-900"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
