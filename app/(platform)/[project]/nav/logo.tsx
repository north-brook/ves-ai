"use client";

import Icon from "@/components/icon";

export default function NavLogo() {
  return (
    <div className="flex items-center gap-2 transition-all duration-300 [nav[data-collapsed='true']_&]:gap-0">
      <div className="relative flex-shrink-0">
        <Icon size={18} />
        <div className="from-accent-purple via-accent-pink to-accent-orange absolute inset-0 bg-gradient-to-r opacity-50 blur-xl" />
      </div>
      <span className="font-display overflow-hidden text-xl font-bold whitespace-nowrap transition-all duration-300 [nav[data-collapsed='true']_&]:w-0 [nav[data-collapsed='true']_&]:opacity-0">
        VES
      </span>
    </div>
  );
}
