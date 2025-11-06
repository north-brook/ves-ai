"use client";

import { useParams } from "next/navigation";

export default function NotFound() {
  const params = useParams();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
      <h1 className="font-display text-6xl font-bold text-gray-900 dark:text-gray-100">
        404
      </h1>
      <div className="flex flex-col items-center justify-center gap-3">
        <h2 className="font-display text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Page Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <a
        href={`/${params.project}`}
        className="rounded-lg bg-slate-100 px-6 py-3 text-center text-slate-800 transition-all duration-200 dark:bg-slate-900 dark:text-slate-200"
      >
        Back to Project
      </a>
    </div>
  );
}
