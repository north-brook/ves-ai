import ProjectNav from "./nav";
import Footer from "@/components/footer";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <ProjectNav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
