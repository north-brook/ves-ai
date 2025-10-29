import type { Metadata } from "next";
import TopBar from "./topbar";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="bg-background text-foreground flex min-h-screen w-full flex-row pt-12">
        {children}
      </div>
      <TopBar />
    </>
  );
}
