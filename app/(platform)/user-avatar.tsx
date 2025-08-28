"use client";

import { LogOut, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { User } from "@/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function UserAvatar({ user }: { user: User | null }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="border-border bg-surface hover:bg-surface/80 flex h-10 w-10 items-center justify-center rounded-full border transition-colors">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.first_name || "User"}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <UserIcon className="text-foreground-secondary h-5 w-5" />
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
          <p className="text-foreground-secondary text-sm">{user?.email}</p>
        </div>

        <div className="pt-2">
          <Link
            href="/auth/logout"
            prefetch={false}
            className="text-foreground-secondary hover:bg-surface hover:text-foreground flex items-center gap-2 rounded px-2 py-2 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
