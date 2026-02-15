import { Wrench } from "lucide-react";

export default function WIP() {
  return (
    <main className="flex h-full w-full flex-col items-center justify-center px-4">
      <Wrench className="h-16 w-16 text-slate-600 dark:text-slate-400" />
      <h2 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">
        Under Construction
      </h2>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        {"We're still building this page"}
      </p>
    </main>
  );
}
