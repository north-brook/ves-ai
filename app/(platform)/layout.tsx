import { Navigation } from "./navigation";
import { Footer } from "@/components/footer";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="pt-20">{children}</main>
      <Footer />
    </div>
  );
}