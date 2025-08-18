import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardButton({
  projectSlug,
}: {
  projectSlug: string;
}) {
  return (
    <Link
      href={`/${projectSlug}`}
      className="group font-display from-accent-purple via-accent-pink to-accent-orange relative inline-block rounded-lg bg-gradient-to-r p-[2px] text-lg font-semibold transition-all duration-200"
    >
      <div className="bg-background group-hover:bg-background/90 flex items-center gap-2 rounded-[6px] px-8 py-4 transition-all">
        <span className="text-foreground font-semibold">Go to Dashboard</span>
        <ArrowRight className="text-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
