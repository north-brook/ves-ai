import NavLinks from "./links";

export default async function SideBar({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;
  return (
    <nav className="group fixed top-12 bottom-0 left-0 w-12 flex-col items-stretch justify-between overflow-hidden border-r border-slate-200 bg-slate-50 transition-all duration-100 hover:w-[160px] dark:border-slate-800 dark:bg-slate-950">
      <NavLinks projectSlug={projectSlug} />
    </nav>
  );
}
