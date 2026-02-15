import ProjectSettingsNav from "./nav";

export default async function ProjectSettingsLayout({
  params,
  children,
}: {
  params: Promise<{ project: string }>;
  children: React.ReactNode;
}) {
  const { project: projectSlug } = await params;

  return (
    <>
      <ProjectSettingsNav projectSlug={projectSlug} />
      {children}
    </>
  );
}
