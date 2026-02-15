import MarketingNav from "./nav";
import Footer from "@/components/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <MarketingNav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
