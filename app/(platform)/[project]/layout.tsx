import ProjectNav from "./nav";
import Footer from "@/components/footer";
import type { Metadata } from "next";

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
    <div className="bg-background text-foreground min-h-screen">
      <ProjectNav />
      <main className="mx-auto flex max-w-7xl flex-col items-stretch gap-6 px-6 py-12">
        {children}
      </main>
      <Footer />
    </div>
  );
}
