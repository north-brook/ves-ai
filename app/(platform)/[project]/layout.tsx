import type { Metadata } from "next";
import SideBar from "./sidebar";
import SyncSessions from "./sync";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProjectLayout({
  children,
  params,
}: {
  params: Promise<{ project: string }>;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex min-h-[calc(100vh-48px)] w-full flex-row pl-12">
        {children}
      </div>
      <SideBar params={params} />
      <SyncSessions />
    </>
  );
}
