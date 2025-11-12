// import "@/app/code.css";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <article>{children}</article>
    </div>
  );
}
