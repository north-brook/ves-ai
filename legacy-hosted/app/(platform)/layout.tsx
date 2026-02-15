import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import LogInPage from "../login/page";
import TopBar from "./topbar";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <LogInPage />;

  return (
    <>
      <div className="bg-background text-foreground flex min-h-screen w-full flex-row pt-12">
        {children}
      </div>
      <TopBar />
    </>
  );
}
